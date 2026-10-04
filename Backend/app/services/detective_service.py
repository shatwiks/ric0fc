import os
import time
import uuid
import duckdb
from typing import Dict, List, Any, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import User
from app.schemas.intelligence import (
    DetectiveAnalyzeRequest,
    DetectiveAnalyzeResponse,
    ContributorItem,
    WaterfallItem,
)
from app.services.dataset_service import DatasetService
from app.services.audit_service import log_audit_event

def quote_ident(name: str) -> str:
    escaped = name.replace('"', '""')
    return f'"{escaped}"'

class DetectiveService:
    @staticmethod
    async def analyze(
        db: AsyncSession,
        request: DetectiveAnalyzeRequest,
        workspace_id: uuid.UUID,
        user: User,
    ) -> DetectiveAnalyzeResponse:
        start_time = time.perf_counter()

        # 1. Fetch dataset and verify workspace ownership
        dataset = await DatasetService.get_dataset(db, request.dataset_id, workspace_id)
        if not dataset.file_path or not os.path.exists(dataset.file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dataset source file is missing from storage.",
            )

        # 2. Validate columns
        col_name_map = {col.name.lower(): col.name for col in dataset.columns}
        if request.metric.lower() not in col_name_map:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Metric column '{request.metric}' does not exist in dataset. Available: {list(col_name_map.values())}",
            )
        real_metric = col_name_map[request.metric.lower()]

        if request.dimension.lower() not in col_name_map:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Dimension column '{request.dimension}' does not exist in dataset. Available: {list(col_name_map.values())}",
            )
        real_dimension = col_name_map[request.dimension.lower()]

        agg_func = (request.agg or "sum").upper()
        if agg_func not in ["SUM", "AVG", "COUNT"]:
            agg_func = "SUM"

        normalized_path = dataset.file_path.replace("\\", "/")
        con = duckdb.connect(":memory:")

        try:
            # 3. Detect date / comparison strategy
            date_col = None
            if request.date_column and request.date_column.lower() in col_name_map:
                date_col = col_name_map[request.date_column.lower()]
            else:
                for col in dataset.columns:
                    if col.data_type == "datetime" or any(k in col.name.lower() for k in ["date", "time", "year", "month"]):
                        date_col = col.name
                        break

            baseline_label = "Baseline"
            current_label = "Current"
            baseline_filter = ""
            current_filter = ""

            if date_col and request.comparison_mode in ("auto", "period"):
                try:
                    date_q = f'SELECT MIN({quote_ident(date_col)}), MAX({quote_ident(date_col)}) FROM read_csv_auto(\'{normalized_path}\') WHERE {quote_ident(date_col)} IS NOT NULL'
                    min_date, max_date = con.execute(date_q).fetchone()
                    if min_date and max_date and str(min_date) != str(max_date):
                        mid_q = f"""
                            SELECT {quote_ident(date_col)} 
                            FROM read_csv_auto('{normalized_path}')
                            WHERE {quote_ident(date_col)} IS NOT NULL
                            ORDER BY {quote_ident(date_col)}
                            LIMIT 1 OFFSET (SELECT COUNT(*) / 2 FROM read_csv_auto('{normalized_path}') WHERE {quote_ident(date_col)} IS NOT NULL)
                        """
                        mid_date_row = con.execute(mid_q).fetchone()
                        mid_date = mid_date_row[0] if mid_date_row else None
                        if mid_date:
                            baseline_filter = f"{quote_ident(date_col)} < '{mid_date}'"
                            current_filter = f"{quote_ident(date_col)} >= '{mid_date}'"
                            baseline_label = f"Prior Period (< {str(mid_date)[:10]})"
                            current_label = f"Recent Period (>= {str(mid_date)[:10]})"
                except Exception:
                    pass

            if not baseline_filter:
                # Sequential row split
                total_rows_q = f"SELECT COUNT(*) FROM read_csv_auto('{normalized_path}')"
                total_cnt = con.execute(total_rows_q).fetchone()[0]
                half_cnt = total_cnt // 2
                baseline_filter = f"row_num <= {half_cnt}"
                current_filter = f"row_num > {half_cnt}"
                baseline_label = "Baseline Period (H1)"
                current_label = "Current Period (H2)"
                table_source = f"(SELECT *, ROW_NUMBER() OVER () as row_num FROM read_csv_auto('{normalized_path}'))"
            else:
                table_source = f"read_csv_auto('{normalized_path}')"

            # 4. Run baseline and current queries
            metric_target = "*" if real_metric == "*" else quote_ident(real_metric)
            b_query = f"""
                SELECT {quote_ident(real_dimension)} AS dim, {agg_func}({metric_target}) AS val
                FROM {table_source}
                WHERE {quote_ident(real_dimension)} IS NOT NULL AND {baseline_filter}
                GROUP BY {quote_ident(real_dimension)}
            """
            c_query = f"""
                SELECT {quote_ident(real_dimension)} AS dim, {agg_func}({metric_target}) AS val
                FROM {table_source}
                WHERE {quote_ident(real_dimension)} IS NOT NULL AND {current_filter}
                GROUP BY {quote_ident(real_dimension)}
            """

            b_rows = con.execute(b_query).fetchall()
            c_rows = con.execute(c_query).fetchall()

            b_map: Dict[str, float] = {str(r[0]): float(r[1] or 0.0) for r in b_rows}
            c_map: Dict[str, float] = {str(r[0]): float(r[1] or 0.0) for r in c_rows}

            baseline_total = sum(b_map.values())
            current_total = sum(c_map.values())
            variance_abs = current_total - baseline_total
            variance_pct = round((variance_abs / baseline_total * 100.0) if baseline_total != 0 else 0.0, 2)

            all_dims = sorted(list(set(b_map.keys()) | set(c_map.keys())))
            contributors_list: List[ContributorItem] = []

            for d in all_dims:
                bv = b_map.get(d, 0.0)
                cv = c_map.get(d, 0.0)
                diff = cv - bv
                c_pct = round((diff / variance_abs * 100.0) if variance_abs != 0 else 0.0, 2)
                impact = "positive" if diff > 0 else ("negative" if diff < 0 else "neutral")
                contributors_list.append(ContributorItem(
                    dimension_value=d,
                    baseline_value=round(bv, 2),
                    current_value=round(cv, 2),
                    variance=round(diff, 2),
                    contribution_pct=c_pct,
                    impact=impact,
                ))

            # Sort by absolute variance descending
            contributors_list.sort(key=lambda x: abs(x.variance), reverse=True)

            top_driver = None
            top_detractor = None
            for item in contributors_list:
                if item.variance > 0 and not top_driver:
                    top_driver = f"{item.dimension_value} (+{item.variance:,.2f}, {item.contribution_pct:.1f}%)"
                elif item.variance < 0 and not top_detractor:
                    top_detractor = f"{item.dimension_value} ({item.variance:,.2f}, {item.contribution_pct:.1f}%)"

            # 5. Build Waterfall Data Structure
            waterfall: List[WaterfallItem] = []
            waterfall.append(WaterfallItem(
                label=baseline_label,
                value=round(baseline_total, 2),
                change=0.0,
                is_total=True,
                contribution_pct=None,
            ))

            running_total = baseline_total
            top_n = contributors_list[:7]
            remaining = contributors_list[7:]

            for item in top_n:
                running_total += item.variance
                waterfall.append(WaterfallItem(
                    label=item.dimension_value,
                    value=round(running_total, 2),
                    change=item.variance,
                    is_total=False,
                    contribution_pct=item.contribution_pct,
                ))

            if remaining:
                other_variance = sum(r.variance for r in remaining)
                running_total += other_variance
                other_pct = round((other_variance / variance_abs * 100.0) if variance_abs != 0 else 0.0, 2)
                waterfall.append(WaterfallItem(
                    label=f"Other Drivers ({len(remaining)})",
                    value=round(running_total, 2),
                    change=round(other_variance, 2),
                    is_total=False,
                    contribution_pct=other_pct,
                ))

            waterfall.append(WaterfallItem(
                label=current_label,
                value=round(current_total, 2),
                change=round(variance_abs, 2),
                is_total=True,
                contribution_pct=100.0 if variance_abs != 0 else 0.0,
            ))

            # 6. Generate 100% data-grounded narrative explanation
            sign = "+" if variance_abs > 0 else ""
            explanation = (
                f"Overall {real_metric} shifted from {baseline_total:,.2f} ({baseline_label}) "
                f"to {current_total:,.2f} ({current_label}), representing a total variance of "
                f"{sign}{variance_abs:,.2f} ({sign}{variance_pct:.2f}%). "
            )
            if top_driver:
                explanation += f"The principal growth driver was {top_driver}. "
            if top_detractor:
                explanation += f"The primary drag on performance was {top_detractor}. "
            explanation += f"Analyzed across {len(contributors_list)} distinct values in '{real_dimension}'."

            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            await log_audit_event(
                db=db,
                action="detective:analyze",
                resource_type="dataset",
                resource_id=str(dataset.id),
                user_id=user.id,
                workspace_id=workspace_id,
                details={
                    "metric": real_metric,
                    "dimension": real_dimension,
                    "variance_abs": variance_abs,
                    "variance_pct": variance_pct,
                    "execution_time_ms": duration_ms,
                },
            )

            return DetectiveAnalyzeResponse(
                dataset_id=dataset.id,
                metric=real_metric,
                dimension=real_dimension,
                baseline_label=baseline_label,
                current_label=current_label,
                baseline_total=round(baseline_total, 2),
                current_total=round(current_total, 2),
                variance_abs=round(variance_abs, 2),
                variance_pct=variance_pct,
                top_driver=top_driver,
                top_detractor=top_detractor,
                contributors=contributors_list,
                waterfall=waterfall,
                explanation=explanation,
                execution_time_ms=duration_ms,
            )

        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Data Detective analysis execution failed: {str(e)}",
            )
        finally:
            con.close()

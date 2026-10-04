import os
import time
import uuid
import duckdb
from typing import List, Any, Dict
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import User
from app.models.data import Dataset
from app.schemas.dataset import AggregateQueryRequest, AggregateQueryResponse
from app.services.dataset_service import DatasetService

def quote_ident(ident: str) -> str:
    escaped = ident.replace('"', '""')
    return f'"{escaped}"'

class QueryService:
    @staticmethod
    async def execute_aggregate_query(
        db: AsyncSession,
        request: AggregateQueryRequest,
        workspace_id: uuid.UUID,
        user: User,
    ) -> AggregateQueryResponse:
        start_time = time.perf_counter()

        # 1. Fetch dataset and validate ownership
        dataset = await DatasetService.get_dataset(db, request.dataset_id, workspace_id)
        if not dataset.file_path or not os.path.exists(dataset.file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dataset source file is missing from storage.",
            )

        # 2. Schema Validation (Case-Insensitive Resolution)
        col_name_map = {col.name.lower(): col.name for col in dataset.columns}
        valid_columns = {col.name: col for col in dataset.columns}
        
        # Validate & normalize dimensions
        for i, dim in enumerate(request.dimensions):
            if dim.lower() in col_name_map:
                request.dimensions[i] = col_name_map[dim.lower()]
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Dimension column '{dim}' does not exist in dataset '{dataset.name}'. Available: {list(valid_columns.keys())}",
                )

        # Validate & normalize measures
        for m in request.measures:
            if m.column != "*":
                if m.column.lower() in col_name_map:
                    m.column = col_name_map[m.column.lower()]
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Measure column '{m.column}' does not exist in dataset '{dataset.name}'. Available: {list(valid_columns.keys())}",
                    )
            if m.agg.lower() not in ["sum", "avg", "min", "max", "count"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unsupported aggregation '{m.agg}'. Supported: sum, avg, min, max, count",
                )

        # Validate & normalize filters
        for f in request.filters:
            if f.column.lower() in col_name_map:
                f.column = col_name_map[f.column.lower()]
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Filter column '{f.column}' does not exist in dataset '{dataset.name}'.",
                )

        # Validate sort
        valid_measure_aliases = {
            (m.alias or f"{m.agg}_{m.column}".replace("*", "all")).lower() for m in request.measures
        }
        valid_measure_cols = {m.column.lower() for m in request.measures}
        for s in request.sort:
            col_l = s.column.lower()
            if col_l in col_name_map:
                s.column = col_name_map[col_l]
            elif col_l not in valid_measure_aliases and col_l not in valid_measure_cols:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Sort column '{s.column}' does not exist in dataset or active query measures.",
                )

        # 3. Construct DuckDB SQL Query
        select_clauses: List[str] = []
        aliases: List[str] = []
        params: List[Any] = []
        measure_col_to_alias: Dict[str, str] = {}

        # Add dimensions to SELECT
        for dim in request.dimensions:
            select_clauses.append(quote_ident(dim))
            aliases.append(dim)

        # Add measures to SELECT
        for m in request.measures:
            agg_func = m.agg.upper()
            target_col = "*" if m.column == "*" else quote_ident(m.column)
            alias = m.alias or f"{m.agg}_{m.column}".replace("*", "all")
            select_clauses.append(f"{agg_func}({target_col}) AS {quote_ident(alias)}")
            aliases.append(alias)
            measure_col_to_alias[m.column] = alias

        if not select_clauses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Query must contain at least one dimension or measure.",
            )

        normalized_path = dataset.file_path.replace("\\", "/")
        sql_parts = [
            f"SELECT {', '.join(select_clauses)}",
            f"FROM read_csv_auto('{normalized_path}')",
        ]

        # WHERE Clause with Parameterization
        where_conditions: List[str] = []
        for f in request.filters:
            col_quoted = quote_ident(f.column)
            op = f.operator.lower()
            val = f.value

            if op == "eq":
                where_conditions.append(f"{col_quoted} = ?")
                params.append(val)
            elif op == "ne":
                where_conditions.append(f"{col_quoted} != ?")
                params.append(val)
            elif op == "gt":
                where_conditions.append(f"{col_quoted} > ?")
                params.append(val)
            elif op == "gte":
                where_conditions.append(f"{col_quoted} >= ?")
                params.append(val)
            elif op == "lt":
                where_conditions.append(f"{col_quoted} < ?")
                params.append(val)
            elif op == "lte":
                where_conditions.append(f"{col_quoted} <= ?")
                params.append(val)
            elif op == "contains":
                where_conditions.append(f"{col_quoted} ILIKE ?")
                params.append(f"%{val}%")
            elif op == "in":
                if not isinstance(val, (list, tuple)):
                    val = [val]
                if not val:
                    where_conditions.append("1=0")
                else:
                    placeholders = ", ".join(["?"] * len(val))
                    where_conditions.append(f"{col_quoted} IN ({placeholders})")
                    params.extend(val)
            elif op == "not_in":
                if not isinstance(val, (list, tuple)):
                    val = [val]
                if val:
                    placeholders = ", ".join(["?"] * len(val))
                    where_conditions.append(f"{col_quoted} NOT IN ({placeholders})")
                    params.extend(val)

        if where_conditions:
            sql_parts.append(f"WHERE {' AND '.join(where_conditions)}")

        # GROUP BY Clause
        if request.dimensions:
            group_by_cols = [quote_ident(d) for d in request.dimensions]
            sql_parts.append(f"GROUP BY {', '.join(group_by_cols)}")

        # ORDER BY Clause
        if request.sort:
            order_clauses = []
            for s in request.sort:
                target_col = s.column
                if s.column in measure_col_to_alias and s.column not in request.dimensions:
                    target_col = measure_col_to_alias[s.column]
                direction = "DESC" if s.direction.lower() == "desc" else "ASC"
                order_clauses.append(f"{quote_ident(target_col)} {direction}")
            sql_parts.append(f"ORDER BY {', '.join(order_clauses)}")

        # LIMIT
        effective_limit = max(1, min(request.limit, 5000))
        sql_parts.append(f"LIMIT {effective_limit}")

        final_sql = " \n".join(sql_parts)

        # 4. Execute in DuckDB
        con = duckdb.connect(":memory:")
        try:
            cursor = con.execute(final_sql, params)
            col_names = [d[0] for d in cursor.description]
            raw_rows = cursor.fetchall()

            records = []
            for r in raw_rows:
                record = {}
                for col_name, val in zip(col_names, r):
                    if val is None:
                        record[col_name] = None
                    elif hasattr(val, "isoformat"):
                        record[col_name] = val.isoformat()
                    else:
                        record[col_name] = val
                records.append(record)

            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            from app.services.audit_service import log_audit_event
            await log_audit_event(
                db=db,
                action="query:aggregate",
                resource_type="dataset",
                resource_id=str(dataset.id),
                user_id=user.id,
                workspace_id=workspace_id,
                details={
                    "dataset_name": dataset.name,
                    "row_count": len(records),
                    "execution_time_ms": duration_ms,
                },
            )

            return AggregateQueryResponse(
                dataset_id=dataset.id,
                row_count=len(records),
                columns=aliases,
                data=records,
                execution_time_ms=duration_ms,
            )
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"DuckDB analytical query execution failed: {str(e)}",
            )
        finally:
            con.close()

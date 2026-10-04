import uuid
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.models.auth import User
from app.models.data import Dataset
from app.models.intelligence import PulseInsight
from app.schemas.intelligence import PulseInsightResponse, PulseGenerateResponse
from app.services.anomaly_service import AnomalyService
from app.services.audit_service import log_audit_event

class PulseService:
    @staticmethod
    async def generate_insights(
        db: AsyncSession,
        workspace_id: uuid.UUID,
        user: User,
        dataset_id: Optional[uuid.UUID] = None,
    ) -> PulseGenerateResponse:
        # 1. Fetch target datasets for the workspace
        stmt = (
            select(Dataset)
            .where(Dataset.workspace_id == workspace_id)
            .options(selectinload(Dataset.columns))
        )
        if dataset_id:
            stmt = stmt.where(Dataset.id == dataset_id)

        result = await db.execute(stmt)
        datasets = result.scalars().all()

        created_insights: List[PulseInsight] = []

        for ds in datasets:
            if not ds.file_path or not ds.columns:
                continue

            # Identify candidate measures and dimensions
            measures = [
                col.name for col in ds.columns
                if col.is_measure or col.data_type in ("integer", "float")
            ]
            dimensions = [
                col.name for col in ds.columns
                if col.is_dimension or col.data_type in ("string", "boolean")
            ]

            if not measures or not dimensions:
                continue

            primary_measure = measures[0]
            # Prioritize standard business measures if present
            for m in measures:
                if any(k in m.lower() for k in ["sales", "revenue", "profit", "amount", "cost"]):
                    primary_measure = m
                    break

            primary_dim = dimensions[0]
            for d in dimensions:
                if any(k in d.lower() for k in ["category", "region", "segment", "status", "type"]):
                    primary_dim = d
                    break

            # 2. Run statistical anomaly scan via DuckDB
            anomalies = AnomalyService.detect_metric_anomalies(
                file_path=ds.file_path,
                metric_col=primary_measure,
                dim_col=primary_dim,
                z_threshold=1.75,
            )

            if anomalies:
                for anom in anomalies[:4]:  # Top detected movements
                    dim_val = anom["dimension_value"]
                    val = anom["value"]
                    mean_val = anom["mean"]
                    pct_diff = anom["percentage_diff"]
                    severity = anom["severity"]

                    trend_word = "Surge" if pct_diff > 0 else "Contraction"
                    title = f"Unusual {abs(pct_diff):.1f}% {trend_word} in {primary_dim} '{dim_val}'"
                    explanation = (
                        f"Segment '{dim_val}' registered {val:,.2f} in {primary_measure}, "
                        f"a {pct_diff:+.1f}% variance against the cohort baseline average of {mean_val:,.2f} "
                        f"(Z-score: {anom['z_score']})."
                    )
                    recommended_action = (
                        f"Audit operational drivers for '{dim_val}' in Data Detective to isolate root contributors."
                    )

                    insight = PulseInsight(
                        workspace_id=workspace_id,
                        dataset_id=ds.id,
                        severity=severity,
                        metric_name=primary_measure,
                        change_percentage=pct_diff,
                        current_value=val,
                        previous_value=mean_val,
                        dimension_affected=primary_dim,
                        dimension_value=dim_val,
                        explanation=explanation,
                        recommended_action=recommended_action,
                        created_at=datetime.now(timezone.utc),
                    )
                    db.add(insight)
                    created_insights.append(insight)
            else:
                # If no extreme anomalies, compute high-value milestone insight
                try:
                    import duckdb
                    con = duckdb.connect(":memory:")
                    norm_path = ds.file_path.replace("\\", "/")
                    summary_q = f"""
                        SELECT 
                            SUM("{primary_measure}"), 
                            AVG("{primary_measure}")
                        FROM read_csv_auto('{norm_path}')
                        WHERE "{primary_measure}" IS NOT NULL
                    """
                    row = con.execute(summary_q).fetchone()
                    con.close()
                    if row and row[0] is not None:
                        tot = float(row[0])
                        avg_v = float(row[1] or 0.0)
                        insight = PulseInsight(
                            workspace_id=workspace_id,
                            dataset_id=ds.id,
                            severity="info",
                            metric_name=primary_measure,
                            change_percentage=0.0,
                            current_value=tot,
                            previous_value=avg_v,
                            dimension_affected=primary_dim,
                            dimension_value="All Segments",
                            explanation=f"Dataset '{ds.name}' aggregates to a total of {tot:,.2f} across all records with an average transaction value of {avg_v:,.2f}.",
                            recommended_action=f"Explore dimensional breakdowns across '{primary_dim}' in AI Analyst or Data Detective.",
                            created_at=datetime.now(timezone.utc),
                        )
                        db.add(insight)
                        created_insights.append(insight)
                except Exception as e:
                    print(f"[PulseService] Summary insight error: {e}")

        await db.commit()

        # Build response items
        response_items = []
        for ins in created_insights:
            await db.refresh(ins)
            # Find dataset name
            ds_name = next((d.name for d in datasets if d.id == ins.dataset_id), None)
            inv_link = f"/dashboard/data-detective?dataset_id={ins.dataset_id}&metric={ins.metric_name}&dimension={ins.dimension_affected}" if ins.dataset_id else None
            response_items.append(PulseInsightResponse(
                id=ins.id,
                workspace_id=ins.workspace_id,
                dataset_id=ins.dataset_id,
                dataset_name=ds_name,
                severity=ins.severity,
                metric_name=ins.metric_name,
                change_percentage=ins.change_percentage,
                current_value=ins.current_value,
                previous_value=ins.previous_value,
                dimension_affected=ins.dimension_affected,
                dimension_value=ins.dimension_value,
                explanation=ins.explanation,
                recommended_action=ins.recommended_action,
                investigation_link=inv_link,
                created_at=ins.created_at,
            ))

        await log_audit_event(
            db=db,
            action="pulse:generate",
            resource_type="workspace",
            resource_id=str(workspace_id),
            user_id=user.id,
            workspace_id=workspace_id,
            details={"generated_count": len(response_items)},
        )

        return PulseGenerateResponse(
            generated_count=len(response_items),
            insights=response_items,
            message=f"Successfully generated and persisted {len(response_items)} executive intelligence insights.",
        )

    @staticmethod
    async def list_insights(
        db: AsyncSession,
        workspace_id: uuid.UUID,
        severity: Optional[str] = None,
        dataset_id: Optional[uuid.UUID] = None,
    ) -> List[PulseInsightResponse]:
        stmt = (
            select(PulseInsight, Dataset.name.label("dataset_name"))
            .outerjoin(Dataset, PulseInsight.dataset_id == Dataset.id)
            .where(PulseInsight.workspace_id == workspace_id)
        )
        if severity:
            stmt = stmt.where(PulseInsight.severity == severity.lower())
        if dataset_id:
            stmt = stmt.where(PulseInsight.dataset_id == dataset_id)

        stmt = stmt.order_by(desc(PulseInsight.created_at))
        result = await db.execute(stmt)
        rows = result.all()

        response = []
        for ins, ds_name in rows:
            inv_link = f"/dashboard/data-detective?dataset_id={ins.dataset_id}&metric={ins.metric_name}&dimension={ins.dimension_affected}" if ins.dataset_id else None
            response.append(PulseInsightResponse(
                id=ins.id,
                workspace_id=ins.workspace_id,
                dataset_id=ins.dataset_id,
                dataset_name=ds_name,
                severity=ins.severity,
                metric_name=ins.metric_name,
                change_percentage=ins.change_percentage,
                current_value=ins.current_value,
                previous_value=ins.previous_value,
                dimension_affected=ins.dimension_affected,
                dimension_value=ins.dimension_value,
                explanation=ins.explanation,
                recommended_action=ins.recommended_action,
                investigation_link=inv_link,
                created_at=ins.created_at,
            ))
        return response

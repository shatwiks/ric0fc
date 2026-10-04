import os
import re
import uuid
import time
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
import duckdb
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.models.auth import User, UserRole
from app.models.data import Dataset
from app.models.dashboard import Dashboard, DashboardWidget
from app.models.intelligence import AIConversation, AIMessage
from app.schemas.intelligence import (
    AIChatRequest,
    AIChatResponse,
    AIConversationResponse,
    AIConversationDetailResponse,
    AIMessageResponse,
    GenerateDashboardRequest,
    GenerateDashboardResponse,
)
from app.services.dataset_service import DatasetService
from app.services.audit_service import log_audit_event

def quote_ident(name: str) -> str:
    escaped = name.replace('"', '""')
    return f'"{escaped}"'

class AIService:
    @staticmethod
    async def chat(
        db: AsyncSession,
        request: AIChatRequest,
        workspace_id: uuid.UUID,
        user: User,
    ) -> AIChatResponse:
        start_time = time.perf_counter()

        # 1. Fetch dataset and verify workspace ownership
        dataset = await DatasetService.get_dataset(db, request.dataset_id, workspace_id)
        if not dataset.file_path or not os.path.exists(dataset.file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dataset file is missing from storage.",
            )

        # 2. Manage Conversation
        conversation = None
        if request.conversation_id:
            conv_stmt = select(AIConversation).where(
                AIConversation.id == request.conversation_id,
                AIConversation.workspace_id == workspace_id,
            )
            res = await db.execute(conv_stmt)
            conversation = res.scalar_one_or_none()
            if not conversation:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="AI Conversation not found in this workspace.",
                )
            if conversation.user_id != user.id and user.role != UserRole.ADMIN:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this conversation.",
                )
        else:
            # Create a new conversation
            title_text = request.message[:50].strip() or "Dataset Analysis"
            conversation = AIConversation(
                workspace_id=workspace_id,
                user_id=user.id,
                dataset_id=dataset.id,
                title=title_text,
                created_at=datetime.now(timezone.utc),
            )
            db.add(conversation)
            await db.flush()

        # Save user message
        user_msg = AIMessage(
            conversation_id=conversation.id,
            sender="user",
            text=request.message,
            created_at=datetime.now(timezone.utc),
        )
        db.add(user_msg)
        await db.flush()

        # 3. Deterministic Semantic Query Parser
        col_name_map = {col.name.lower(): col.name for col in dataset.columns}
        measures = [col.name for col in dataset.columns if col.is_measure or col.data_type in ("integer", "float")]
        dimensions = [col.name for col in dataset.columns if col.is_dimension or col.data_type in ("string", "boolean")]
        date_cols = [col.name for col in dataset.columns if col.data_type == "datetime" or any(k in col.name.lower() for k in ["date", "time", "year", "month"])]

        msg_lower = request.message.lower()

        # Detect Measure
        target_measure = None
        for m in measures:
            if m.lower() in msg_lower:
                target_measure = m
                break

        if not target_measure:
            # Check common synonyms
            synonyms = {
                "sales": ["sale", "revenue", "turnover", "gross"],
                "profit": ["margin", "income", "gain", "net"],
                "quantity": ["units", "qty", "volume", "count"],
                "cost": ["expense", "spend", "expenditure"],
                "price": ["rate", "cost_per_unit", "amount"],
            }
            for syn_key, syn_list in synonyms.items():
                if any(k in msg_lower for k in [syn_key] + syn_list):
                    for m in measures:
                        if syn_key in m.lower():
                            target_measure = m
                            break
                    if target_measure:
                        break

        if not target_measure and measures:
            target_measure = measures[0]

        # Detect Aggregation
        agg = "SUM"
        if any(k in msg_lower for k in ["average", "avg", "mean"]):
            agg = "AVG"
        elif any(k in msg_lower for k in ["minimum", "min", "lowest", "least"]):
            agg = "MIN" if "lowest" not in msg_lower or "by" not in msg_lower else "SUM"
        elif any(k in msg_lower for k in ["maximum", "max", "highest", "peak"]):
            agg = "MAX" if "highest" not in msg_lower or "by" not in msg_lower else "SUM"
        elif any(k in msg_lower for k in ["how many", "count", "number of", "records", "transactions"]):
            agg = "COUNT"
            target_measure = "*"

        # Detect Dimension
        target_dim = None
        for d in dimensions:
            if d.lower() in msg_lower:
                target_dim = d
                break

        # Check for date / time trend requests
        if not target_dim and date_cols and any(k in msg_lower for k in ["trend", "over time", "monthly", "yearly", "daily", "timeline", "date", "year"]):
            target_dim = date_cols[0]

        # Check for keywords like "by <word>", "per <word>"
        if not target_dim:
            by_match = re.search(r'\b(?:by|per|across|for each)\s+([a-zA-Z0-9_]+)', msg_lower)
            if by_match:
                extracted = by_match.group(1)
                for d in dimensions + date_cols:
                    if extracted in d.lower():
                        target_dim = d
                        break

        # Detect Limit & Sorting
        limit = 50
        sort_dir = "DESC"
        top_match = re.search(r'\btop\s+(\d+)', msg_lower)
        bottom_match = re.search(r'\b(?:bottom|lowest)\s+(\d+)', msg_lower)
        if top_match:
            limit = max(1, min(int(top_match.group(1)), 1000))
            sort_dir = "DESC"
        elif bottom_match:
            limit = max(1, min(int(bottom_match.group(1)), 1000))
            sort_dir = "ASC"
        elif any(k in msg_lower for k in ["lowest", "bottom", "worst"]):
            sort_dir = "ASC"
            limit = 10
        elif any(k in msg_lower for k in ["highest", "top", "best"]):
            sort_dir = "DESC"
            limit = 10

        # Detect Filters
        filters = []
        for col in dataset.columns:
            pattern = rf'\b{re.escape(col.name.lower())}\s*(?:is|=|equals)\s*[\'"]?([a-zA-Z0-9_\s-]+)[\'"]?'
            match = re.search(pattern, msg_lower)
            if match:
                f_val = match.group(1).strip()
                filters.append({"column": col.name, "operator": "eq", "value": f_val})

        # 4. Construct and execute DuckDB Query
        normalized_path = dataset.file_path.replace("\\", "/")
        con = duckdb.connect(":memory:")

        select_parts = []
        params = []
        where_parts = []

        for f in filters:
            where_parts.append(f"{quote_ident(f['column'])} = ?")
            params.append(f['value'])

        where_clause = f"WHERE {' AND '.join(where_parts)}" if where_parts else ""

        columns_used = []
        if target_dim:
            columns_used.append(target_dim)
        if target_measure and target_measure != "*":
            columns_used.append(target_measure)

        records: List[Dict[str, Any]] = []
        chart_type = "kpi"

        try:
            if target_dim:
                # Grouped Dimensional Query
                measure_quoted = "*" if target_measure == "*" else quote_ident(target_measure)
                measure_alias = f"{agg.lower()}_{target_measure.replace('*', 'all')}"
                sql = f"""
                    SELECT 
                        {quote_ident(target_dim)} AS dimension,
                        {agg}({measure_quoted}) AS {quote_ident(measure_alias)}
                    FROM read_csv_auto('{normalized_path}')
                    {where_clause}
                    GROUP BY {quote_ident(target_dim)}
                    ORDER BY {quote_ident(measure_alias)} {sort_dir}
                    LIMIT {limit}
                """
                cursor = con.execute(sql, params)
                raw_rows = cursor.fetchall()
                for r in raw_rows:
                    dim_val = str(r[0]) if r[0] is not None else "Unknown"
                    val = float(r[1]) if r[1] is not None else 0.0
                    records.append({
                        "dimension": dim_val,
                        "value": round(val, 2),
                        target_dim: dim_val,
                        measure_alias: round(val, 2),
                    })

                # Determine Chart Recommendation
                if target_dim in date_cols or any(k in target_dim.lower() for k in ["date", "time", "year", "month"]):
                    chart_type = "line"
                elif len(records) <= 6:
                    chart_type = "donut"
                else:
                    chart_type = "bar"

                # Formulate real-data narrative explanation
                total_val = sum(r["value"] for r in records)
                top_record = records[0] if records else None
                lowest_record = records[-1] if records else None

                top_pct = round((top_record['value'] / total_val * 100) if total_val != 0 else 0.0, 1) if top_record else 0.0
                reply_text = (
                    f"Analyzed {len(records)} segments for **{target_measure}** grouped by **{target_dim}**. "
                    f"The top-ranking segment is **{top_record['dimension']}** with **{top_record['value']:,.2f}** "
                    f"({top_pct}% of total aggregated {target_measure}). "
                )
                if lowest_record and lowest_record != top_record:
                    reply_text += f"The lowest segment is **{lowest_record['dimension']}** with **{lowest_record['value']:,.2f}**."

            else:
                # Overall Scalar KPI Query
                measure_quoted = "*" if target_measure == "*" else quote_ident(target_measure)
                measure_alias = f"{agg.lower()}_{target_measure.replace('*', 'all')}"
                sql = f"""
                    SELECT {agg}({measure_quoted}) AS {quote_ident(measure_alias)}, COUNT(*) as total_rows
                    FROM read_csv_auto('{normalized_path}')
                    {where_clause}
                """
                row = con.execute(sql, params).fetchone()
                val = float(row[0]) if row and row[0] is not None else 0.0
                total_rows = int(row[1]) if row and row[1] is not None else 0
                records.append({
                    "dimension": "Total",
                    "value": round(val, 2),
                    measure_alias: round(val, 2),
                    "total_rows": total_rows,
                })
                chart_type = "kpi"

                reply_text = (
                    f"The overall calculated **{agg.upper()}** for **{target_measure}** is **{val:,.2f}** "
                    f"computed across {total_rows:,} records in dataset **{dataset.name}**."
                )

        except Exception as e:
            reply_text = f"Analyzed schema for {dataset.name}, but query execution faced a syntax constraint: {str(e)}"
            records = []
            sql = "-- Query execution failed"
        finally:
            con.close()

        query_plan = {
            "sql": sql.strip(),
            "target_measure": target_measure,
            "aggregation": agg,
            "dimension": target_dim,
            "filters": filters,
            "limit": limit,
            "sort_direction": sort_dir,
            "dataset_name": dataset.name,
        }

        chart_config = {
            "chart_type": chart_type,
            "x_axis": target_dim or "Metric",
            "y_axis": target_measure,
            "title": f"{agg.title()} of {target_measure}" + (f" by {target_dim}" if target_dim else ""),
        }

        metrics_data = {
            "row_count": len(records),
            "execution_time_ms": round((time.perf_counter() - start_time) * 1000, 2),
            "total_value": round(sum(r.get("value", 0.0) for r in records), 2) if records else 0.0,
        }

        # 5. Save assistant reply in database
        asst_msg = AIMessage(
            conversation_id=conversation.id,
            sender="assistant",
            text=reply_text,
            generated_query=query_plan,
            chart_config=chart_config,
            metrics=metrics_data,
            created_at=datetime.now(timezone.utc),
        )
        db.add(asst_msg)
        await db.commit()
        await db.refresh(asst_msg)

        await log_audit_event(
            db=db,
            action="ai:analyst_chat",
            resource_type="dataset",
            resource_id=str(dataset.id),
            user_id=user.id,
            workspace_id=workspace_id,
            details={"message": request.message, "conversation_id": str(conversation.id)},
        )

        return AIChatResponse(
            conversation_id=conversation.id,
            user_message_id=user_msg.id,
            assistant_message_id=asst_msg.id,
            reply=reply_text,
            mode="fallback",
            model_name="Ricoz Deterministic Semantic Engine",
            query_plan=query_plan,
            chart_config=chart_config,
            metrics=metrics_data,
            columns_used=columns_used,
            data=records,
            created_at=asst_msg.created_at,
        )

    @staticmethod
    async def generate_dashboard(
        db: AsyncSession,
        request: GenerateDashboardRequest,
        workspace_id: uuid.UUID,
        user: User,
    ) -> GenerateDashboardResponse:
        # 1. Fetch dataset and verify workspace ownership
        dataset = await DatasetService.get_dataset(db, request.dataset_id, workspace_id)
        if not dataset.file_path or not os.path.exists(dataset.file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dataset source file is missing from storage.",
            )

        # 2. Inspect dataset columns
        measures = [col.name for col in dataset.columns if col.is_measure or col.data_type in ("integer", "float")]
        dimensions = [col.name for col in dataset.columns if col.is_dimension or col.data_type in ("string", "boolean")]
        date_cols = [col.name for col in dataset.columns if col.data_type == "datetime" or any(k in col.name.lower() for k in ["date", "time", "year", "month"])]

        primary_measure = measures[0] if measures else "id"
        for m in measures:
            if any(k in m.lower() for k in ["sales", "revenue", "profit", "amount", "total"]):
                primary_measure = m
                break

        secondary_measure = measures[1] if len(measures) > 1 else primary_measure

        dim1 = dimensions[0] if dimensions else "category"
        for d in dimensions:
            if any(k in d.lower() for k in ["category", "region", "segment", "department", "status"]):
                dim1 = d
                break

        dim2 = dimensions[1] if len(dimensions) > 1 else dim1

        # 3. Create Dashboard Record
        dash_title = request.title or f"{dataset.name} AI Executive Dashboard"
        description = (
            f"Intelligent auto-generated executive dashboard for dataset '{dataset.name}'. "
            f"Synthesized from real schema metrics ({primary_measure}, {dim1})."
        )
        dashboard = Dashboard(
            workspace_id=workspace_id,
            title=dash_title,
            description=description,
            created_by=user.id,
            is_published=False,
            layout={"type": "grid", "columns": 12},
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(dashboard)
        await db.flush()

        # 4. Generate persistent widgets
        widgets_to_add = [
            # KPI 1: Primary Measure Total
            DashboardWidget(
                dashboard_id=dashboard.id,
                dataset_id=dataset.id,
                title=f"Total {primary_measure.replace('_', ' ').title()}",
                chart_type="kpi",
                measures=[{"column": primary_measure, "agg": "sum", "alias": f"sum_{primary_measure}"}],
                dimensions=[],
                filters=[],
                config={"format": "currency", "prefix": "$"},
                position={"x": 0, "y": 0, "w": 4, "h": 2},
            ),
            # KPI 2: Total Records
            DashboardWidget(
                dashboard_id=dashboard.id,
                dataset_id=dataset.id,
                title="Total Transactions / Records",
                chart_type="kpi",
                measures=[{"column": "*", "agg": "count", "alias": "count_all"}],
                dimensions=[],
                filters=[],
                config={"format": "number"},
                position={"x": 4, "y": 0, "w": 4, "h": 2},
            ),
            # KPI 3: Average Measure
            DashboardWidget(
                dashboard_id=dashboard.id,
                dataset_id=dataset.id,
                title=f"Average {primary_measure.replace('_', ' ').title()}",
                chart_type="kpi",
                measures=[{"column": primary_measure, "agg": "avg", "alias": f"avg_{primary_measure}"}],
                dimensions=[],
                filters=[],
                config={"format": "currency", "prefix": "$"},
                position={"x": 8, "y": 0, "w": 4, "h": 2},
            ),
            # Chart 1: Bar Chart of Primary Measure by Dim1
            DashboardWidget(
                dashboard_id=dashboard.id,
                dataset_id=dataset.id,
                title=f"{primary_measure.replace('_', ' ').title()} by {dim1.replace('_', ' ').title()}",
                chart_type="bar",
                dimensions=[dim1],
                measures=[{"column": primary_measure, "agg": "sum", "alias": f"sum_{primary_measure}"}],
                filters=[],
                config={"sort": "desc", "limit": 10},
                position={"x": 0, "y": 2, "w": 6, "h": 4},
            ),
            # Chart 2: Time Trend or Donut Breakdown
            DashboardWidget(
                dashboard_id=dashboard.id,
                dataset_id=dataset.id,
                title=(f"{primary_measure.replace('_', ' ').title()} Timeline Trend" if date_cols else f"{secondary_measure.replace('_', ' ').title()} Distribution by {dim2.replace('_', ' ').title()}"),
                chart_type="line" if date_cols else "donut",
                dimensions=[date_cols[0]] if date_cols else [dim2],
                measures=[{"column": primary_measure if date_cols else secondary_measure, "agg": "sum", "alias": "trend_val"}],
                filters=[],
                config={"sort": "asc" if date_cols else "desc", "limit": 15},
                position={"x": 6, "y": 2, "w": 6, "h": 4},
            ),
            # Widget 3: Detailed Table
            DashboardWidget(
                dashboard_id=dashboard.id,
                dataset_id=dataset.id,
                title=f"{dataset.name} Segment Analysis",
                chart_type="table",
                dimensions=[dim1] + ([dim2] if dim2 != dim1 else []),
                measures=[
                    {"column": primary_measure, "agg": "sum", "alias": f"sum_{primary_measure}"},
                    {"column": secondary_measure, "agg": "avg", "alias": f"avg_{secondary_measure}"},
                ],
                filters=[],
                config={"limit": 25},
                position={"x": 0, "y": 6, "w": 12, "h": 5},
            ),
        ]

        for w in widgets_to_add:
            db.add(w)

        await db.commit()
        await db.refresh(dashboard)

        # Build widget summary for response
        widget_summaries = []
        for w in widgets_to_add:
            widget_summaries.append({
                "id": str(w.id),
                "title": w.title,
                "chart_type": w.chart_type,
                "dimensions": w.dimensions,
                "measures": w.measures,
            })

        await log_audit_event(
            db=db,
            action="dashboard:generate_ai",
            resource_type="dashboard",
            resource_id=str(dashboard.id),
            user_id=user.id,
            workspace_id=workspace_id,
            details={"dataset_id": str(dataset.id), "widgets_count": len(widgets_to_add)},
        )

        return GenerateDashboardResponse(
            dashboard_id=dashboard.id,
            title=dashboard.title,
            description=dashboard.description,
            widgets_count=len(widgets_to_add),
            widgets=widget_summaries,
            message=f"Successfully generated and persisted dashboard '{dashboard.title}' with {len(widgets_to_add)} widgets.",
        )

    @staticmethod
    async def list_conversations(
        db: AsyncSession,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> List[AIConversationResponse]:
        stmt = (
            select(AIConversation, Dataset.name.label("dataset_name"))
            .outerjoin(Dataset, AIConversation.dataset_id == Dataset.id)
            .where(
                AIConversation.workspace_id == workspace_id,
                AIConversation.user_id == user_id,
            )
            .order_by(desc(AIConversation.created_at))
        )
        res = await db.execute(stmt)
        rows = res.all()

        results = []
        for conv, ds_name in rows:
            # count messages
            count_stmt = select(AIMessage).where(AIMessage.conversation_id == conv.id)
            c_res = await db.execute(count_stmt)
            m_count = len(c_res.scalars().all())

            results.append(AIConversationResponse(
                id=conv.id,
                title=conv.title,
                dataset_id=conv.dataset_id,
                dataset_name=ds_name,
                created_at=conv.created_at,
                messages_count=m_count,
            ))
        return results

    @staticmethod
    async def get_conversation(
        db: AsyncSession,
        conversation_id: uuid.UUID,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> AIConversationDetailResponse:
        stmt = (
            select(AIConversation, Dataset.name.label("dataset_name"))
            .outerjoin(Dataset, AIConversation.dataset_id == Dataset.id)
            .where(
                AIConversation.id == conversation_id,
                AIConversation.workspace_id == workspace_id,
            )
        )
        res = await db.execute(stmt)
        row = res.first()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found.",
            )
        conv, ds_name = row
        if conv.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this conversation.",
            )

        # Fetch messages
        m_stmt = (
            select(AIMessage)
            .where(AIMessage.conversation_id == conv.id)
            .order_by(AIMessage.created_at.asc())
        )
        m_res = await db.execute(m_stmt)
        messages = m_res.scalars().all()

        return AIConversationDetailResponse(
            id=conv.id,
            title=conv.title,
            dataset_id=conv.dataset_id,
            dataset_name=ds_name,
            created_at=conv.created_at,
            messages=[
                AIMessageResponse(
                    id=m.id,
                    conversation_id=m.conversation_id,
                    sender=m.sender,
                    text=m.text,
                    generated_query=m.generated_query,
                    chart_config=m.chart_config,
                    metrics=m.metrics,
                    created_at=m.created_at,
                )
                for m in messages
            ],
        )

    @staticmethod
    async def delete_conversation(
        db: AsyncSession,
        conversation_id: uuid.UUID,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Dict[str, str]:
        stmt = select(AIConversation).where(
            AIConversation.id == conversation_id,
            AIConversation.workspace_id == workspace_id,
        )
        res = await db.execute(stmt)
        conv = res.scalar_one_or_none()
        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found.",
            )
        if conv.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this conversation.",
            )
        await db.delete(conv)
        await db.commit()
        return {"message": "Conversation successfully deleted."}

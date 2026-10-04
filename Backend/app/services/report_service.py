import os
import uuid
import time
import duckdb
from datetime import datetime, timezone
from typing import List, Tuple, Optional, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.config import settings
from app.models.auth import User
from app.models.data import Dataset
from app.models.dashboard import Dashboard, DashboardWidget
from app.models.governance import Report, ReportSchedule
from app.schemas.report import (
    ReportExportCSVRequest,
    ReportExportPDFRequest,
    ReportResponse,
    ReportScheduleCreate,
    ReportScheduleResponse,
)
from app.services.audit_service import log_audit_event
from app.services.dataset_service import DatasetService

REPORTS_DIR = os.path.join(settings.UPLOAD_DIR, "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)

class ReportService:
    @staticmethod
    async def export_csv(
        db: AsyncSession,
        request: ReportExportCSVRequest,
        workspace_id: uuid.UUID,
        user: User,
    ) -> Tuple[str, str, int, Report]:
        """
        Executes a real CSV export with DuckDB filtering.
        Returns: (file_path, filename, file_size_bytes, report_record)
        """
        dest_filename = f"{uuid.uuid4().hex[:12]}_export.csv"
        dest_path = os.path.join(REPORTS_DIR, dest_filename)

        report_name = request.name or "RicozViz Data Extract"
        dataset_id = request.dataset_id
        dashboard_id = request.dashboard_id

        # 1. Dataset export
        if dataset_id:
            dataset = await DatasetService.get_dataset(db, dataset_id, workspace_id)
            if not dataset.file_path or not os.path.exists(dataset.file_path):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset file missing on storage.")

            report_name = request.name or f"{dataset.name}_Export"
            normalized_path = dataset.file_path.replace("\\", "/")

            where_clauses = []
            params = []
            if request.filters:
                allowed_cols = {c.name for c in (dataset.columns or [])}
                for col, val in request.filters.items():
                    if val and val != "ALL":
                        if allowed_cols and col not in allowed_cols:
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Invalid filter column: '{col}'. Column does not exist in dataset schema.",
                            )
                        clean_col = col.replace('"', '""')
                        where_clauses.append(f'"{clean_col}" = ?')
                        params.append(str(val))

            clean_path = normalized_path.replace("'", "''")
            sql = f"SELECT * FROM read_csv_auto('{clean_path}')"
            if where_clauses:
                sql += f" WHERE {' AND '.join(where_clauses)}"

            con = duckdb.connect(":memory:")
            try:
                dest_sql = dest_path.replace("\\", "/").replace("'", "''")
                if params:
                    con.execute(f"COPY ({sql}) TO '{dest_sql}' (HEADER, DELIMITER ',')", params)
                else:
                    con.execute(f"COPY ({sql}) TO '{dest_sql}' (HEADER, DELIMITER ',')")
            finally:
                con.close()

        # 2. Dashboard data export
        elif dashboard_id:
            dash_stmt = select(Dashboard).where(Dashboard.id == dashboard_id).options(selectinload(Dashboard.widgets))
            dash_res = await db.execute(dash_stmt)
            dashboard = dash_res.scalar_one_or_none()
            if not dashboard or dashboard.workspace_id != workspace_id:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found.")

            report_name = request.name or f"{dashboard.title}_Data_Extract"
            # Collect data from all widgets or first widget
            target_w = None
            if dashboard.widgets:
                if request.widget_id:
                    for w in dashboard.widgets:
                        if w.id == request.widget_id and w.dataset_id:
                            target_w = w
                            break
                if not target_w:
                    target_w = next((w for w in dashboard.widgets if w.dataset_id), None)

            if target_w and target_w.dataset_id:
                dataset = await DatasetService.get_dataset(db, target_w.dataset_id, workspace_id)
                normalized_path = dataset.file_path.replace("\\", "/")
                con = duckdb.connect(":memory:")
                try:
                    dest_sql = dest_path.replace("\\", "/")
                    con.execute(f"COPY (SELECT * FROM read_csv_auto('{normalized_path}')) TO '{dest_sql}' (HEADER, DELIMITER ',')")
                finally:
                    con.close()
            else:
                with open(dest_path, "w", encoding="utf-8") as f:
                    f.write(f"metric,value\ndashboard_title,\"{dashboard.title}\"\nwidgets_count,{len(dashboard.widgets)}\nstatus,ready\n")
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Either dataset_id or dashboard_id must be provided for export.")

        file_size = os.path.getsize(dest_path) if os.path.exists(dest_path) else 0

        # Persist report record
        report = Report(
            workspace_id=workspace_id,
            dashboard_id=dashboard_id,
            dataset_id=dataset_id,
            name=report_name,
            format="csv",
            file_path=dest_path,
            file_size_bytes=file_size,
            filters=request.filters or {},
            created_by=user.id,
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)

        # Audit log
        await log_audit_event(
            db=db,
            action="export:csv",
            resource_type="report",
            resource_id=str(report.id),
            user_id=user.id,
            workspace_id=workspace_id,
            details={
                "name": report_name,
                "format": "csv",
                "file_size_bytes": file_size,
                "filters": request.filters,
                "dataset_id": str(dataset_id) if dataset_id else None,
                "dashboard_id": str(dashboard_id) if dashboard_id else None,
            },
        )

        clean_filename = f"{report_name.replace(' ', '_')}.csv"
        return dest_path, clean_filename, file_size, report

    @staticmethod
    async def export_pdf(
        db: AsyncSession,
        request: ReportExportPDFRequest,
        workspace_id: uuid.UUID,
        user: User,
    ) -> Tuple[str, str, int, Report]:
        """
        Generates a real, high-fidelity ReportLab vector PDF export of a dashboard.
        Returns: (file_path, filename, file_size_bytes, report_record)
        """
        dash_stmt = select(Dashboard).where(Dashboard.id == request.dashboard_id).options(selectinload(Dashboard.widgets))
        dash_res = await db.execute(dash_stmt)
        dashboard = dash_res.scalar_one_or_none()

        if not dashboard or dashboard.workspace_id != workspace_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found.")

        dest_filename = f"{uuid.uuid4().hex[:12]}_report.pdf"
        dest_path = os.path.join(REPORTS_DIR, dest_filename)

        report_name = request.name or f"{dashboard.title}_Executive_Report"

        # Generate Real PDF with ReportLab Platypus
        doc = SimpleDocTemplate(
            dest_path,
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40,
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#17191c"),
        )
        subtitle_style = ParagraphStyle(
            'DocSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=11,
            leading=15,
            textColor=colors.HexColor("#777b86"),
        )
        meta_label_style = ParagraphStyle(
            'MetaLabel',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#17191c"),
        )
        meta_val_style = ParagraphStyle(
            'MetaVal',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#555555"),
        )
        section_style = ParagraphStyle(
            'SectionTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=13,
            leading=17,
            textColor=colors.HexColor("#17191c"),
            spaceBefore=12,
            spaceAfter=6,
        )
        table_cell_style = ParagraphStyle(
            'TableCell',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#17191c"),
        )
        table_header_style = ParagraphStyle(
            'TableHeader',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=10,
            textColor=colors.white,
        )

        elements = []

        # 1. Header Banner
        elements.append(Paragraph("RICOZVIZ EXECUTIVE INTELLIGENCE REPORT", ParagraphStyle('SuperHeader', fontName='Helvetica-Bold', fontSize=8, textColor=colors.HexColor("#5d2a1a"), spaceAfter=4)))
        elements.append(Paragraph(dashboard.title, title_style))
        elements.append(Spacer(1, 4))
        elements.append(Paragraph(dashboard.description or "Automated multi-metric executive summary extract generated from PostgreSQL & DuckDB analytics engine.", subtitle_style))
        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#ececec"), spaceBefore=5, spaceAfter=12))

        # 2. Metadata Box
        meta_data = [
            [
                Paragraph("<b>Status:</b>", meta_label_style),
                Paragraph("Published" if dashboard.is_published else "Draft", meta_val_style),
                Paragraph("<b>Generated By:</b>", meta_label_style),
                Paragraph(f"{user.full_name} ({user.role.value})", meta_val_style),
            ],
            [
                Paragraph("<b>Timestamp:</b>", meta_label_style),
                Paragraph(datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"), meta_val_style),
                Paragraph("<b>Active Widgets:</b>", meta_label_style),
                Paragraph(str(len(dashboard.widgets)), meta_val_style),
            ],
        ]
        meta_table = Table(meta_data, colWidths=[80, 180, 90, 180])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8f9fa")),
            ('PADDING', (0, 0), (-1, -1), 6),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 15))

        # 3. Active Filters Section
        if request.filters:
            elements.append(Paragraph("Applied Analytical Filters", section_style))
            filter_rows = [[Paragraph("<b>Filter Dimension</b>", table_header_style), Paragraph("<b>Constraint Value</b>", table_header_style)]]
            for col, val in request.filters.items():
                filter_rows.append([Paragraph(str(col), table_cell_style), Paragraph(str(val), table_cell_style)])
            filter_table = Table(filter_rows, colWidths=[200, 330])
            filter_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#17191c")),
                ('PADDING', (0, 0), (-1, -1), 5),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#ececec")),
            ]))
            elements.append(filter_table)
            elements.append(Spacer(1, 15))

        # 4. Widget Summaries & Sample Data
        elements.append(Paragraph("Dashboard Visualizations & Analytical Summaries", section_style))

        if not dashboard.widgets:
            elements.append(Paragraph("<i>No active widgets currently attached to this dashboard canvas.</i>", subtitle_style))
        else:
            for idx, w in enumerate(dashboard.widgets, 1):
                chart_badge = w.chart_type.upper()
                elements.append(Paragraph(f"<b>{idx}. {w.title}</b> &nbsp;&nbsp;<font size=8 color='#5d2a1a'>[{chart_badge}]</font>", meta_label_style))
                
                dim_str = ", ".join(w.dimensions) if w.dimensions else "None"
                meas_str = ", ".join([f"{m.get('agg', 'sum')}({m.get('column', '*')})" for m in w.measures]) if w.measures else "None"
                elements.append(Paragraph(f"<b>Dimensions:</b> {dim_str} &nbsp;|&nbsp; <b>Measures:</b> {meas_str}", meta_val_style))
                elements.append(Spacer(1, 4))

                # Fetch sample data from dataset if linked
                if w.dataset_id:
                    try:
                        dataset = await DatasetService.get_dataset(db, w.dataset_id, workspace_id)
                        if dataset.file_path and os.path.exists(dataset.file_path):
                            norm_path = dataset.file_path.replace("\\", "/")
                            con = duckdb.connect(":memory:")
                            try:
                                sample_res = con.execute(f"SELECT * FROM read_csv_auto('{norm_path}') LIMIT 4").fetchall()
                                cols = [desc[0] for desc in con.description][:6]  # Limit to 6 cols for PDF width
                                
                                table_rows = [[Paragraph(f"<b>{c}</b>", table_header_style) for c in cols]]
                                for r in sample_res:
                                    row_cells = [Paragraph(str(val if val is not None else ""), table_cell_style) for val in r[:6]]
                                    table_rows.append(row_cells)

                                col_w = 530 / len(cols)
                                sample_table = Table(table_rows, colWidths=[col_w] * len(cols))
                                sample_table.setStyle(TableStyle([
                                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2d3748")),
                                    ('PADDING', (0, 0), (-1, -1), 4),
                                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#ffffff"), colors.HexColor("#f8fafc")]),
                                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                                ]))
                                elements.append(sample_table)
                            finally:
                                con.close()
                    except Exception as e:
                        elements.append(Paragraph(f"<font color='#a0aec0'>Preview unavailable ({str(e)})</font>", meta_val_style))

                elements.append(Spacer(1, 10))

        # 5. Footer Security Disclaimer
        elements.append(Spacer(1, 15))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceBefore=5, spaceAfter=8))
        elements.append(Paragraph("CONFIDENTIAL & PROPRIETARY — Generated by RicozViz Enterprise Data Platform. All access is governed and audited under PostgreSQL SOC2 logging standards.", ParagraphStyle('FooterNotice', fontName='Helvetica', fontSize=7, textColor=colors.HexColor("#94a3b8"), alignment=1)))

        doc.build(elements)
        file_size = os.path.getsize(dest_path) if os.path.exists(dest_path) else 0

        # Persist Report in DB
        report = Report(
            workspace_id=workspace_id,
            dashboard_id=dashboard.id,
            name=report_name,
            format="pdf",
            file_path=dest_path,
            file_size_bytes=file_size,
            filters=request.filters or {},
            created_by=user.id,
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)

        # Audit log
        await log_audit_event(
            db=db,
            action="export:pdf",
            resource_type="report",
            resource_id=str(report.id),
            user_id=user.id,
            workspace_id=workspace_id,
            details={
                "name": report_name,
                "format": "pdf",
                "file_size_bytes": file_size,
                "dashboard_id": str(dashboard.id),
                "dashboard_title": dashboard.title,
            },
        )

        clean_filename = f"{report_name.replace(' ', '_')}.pdf"
        return dest_path, clean_filename, file_size, report

    @staticmethod
    async def list_reports(db: AsyncSession, workspace_id: uuid.UUID) -> List[ReportResponse]:
        stmt = (
            select(Report)
            .where(Report.workspace_id == workspace_id)
            .options(selectinload(Report.creator))
            .order_by(Report.created_at.desc())
        )
        result = await db.execute(stmt)
        reports = result.scalars().all()

        responses = []
        for r in reports:
            responses.append(ReportResponse(
                id=r.id,
                workspace_id=r.workspace_id,
                dashboard_id=r.dashboard_id,
                dataset_id=r.dataset_id,
                name=r.name,
                format=r.format,
                file_size_bytes=r.file_size_bytes,
                filters=r.filters or {},
                created_by=r.created_by,
                creator_name=r.creator.full_name if r.creator else None,
                created_at=r.created_at,
            ))
        return responses

    @staticmethod
    async def get_report(db: AsyncSession, report_id: uuid.UUID, workspace_id: uuid.UUID) -> Report:
        stmt = select(Report).where(Report.id == report_id)
        result = await db.execute(stmt)
        report = result.scalar_one_or_none()

        if not report:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")
        if report.workspace_id != workspace_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        return report

    @staticmethod
    async def delete_report(db: AsyncSession, report_id: uuid.UUID, workspace_id: uuid.UUID, user: User) -> dict:
        report = await ReportService.get_report(db, report_id, workspace_id)
        if report.file_path and os.path.exists(report.file_path):
            try:
                os.remove(report.file_path)
            except Exception:
                pass

        name = report.name
        await db.delete(report)
        await db.commit()

        await log_audit_event(
            db=db,
            action="report:delete",
            resource_type="report",
            resource_id=str(report_id),
            user_id=user.id,
            workspace_id=workspace_id,
            details={"name": name},
        )
        return {"message": f"Report '{name}' deleted successfully."}

    # Schedules
    @staticmethod
    async def list_schedules(db: AsyncSession, workspace_id: uuid.UUID) -> List[ReportScheduleResponse]:
        stmt = select(ReportSchedule).where(ReportSchedule.workspace_id == workspace_id).order_by(ReportSchedule.created_at.desc())
        result = await db.execute(stmt)
        schedules = result.scalars().all()

        res = []
        for s in schedules:
            res.append(ReportScheduleResponse(
                id=s.id,
                workspace_id=s.workspace_id,
                dashboard_id=s.dashboard_id,
                name=s.name,
                frequency=s.frequency,
                format=s.format,
                recipients=s.recipients or [],
                status=s.status,
                next_run_at=s.next_run_at,
                created_at=s.created_at,
            ))
        return res

    @staticmethod
    async def create_schedule(
        db: AsyncSession,
        data: ReportScheduleCreate,
        workspace_id: uuid.UUID,
        user: User,
    ) -> ReportScheduleResponse:
        schedule = ReportSchedule(
            workspace_id=workspace_id,
            dashboard_id=data.dashboard_id,
            name=data.name,
            frequency=data.frequency,
            format=data.format,
            recipients=data.recipients,
            status="active",
            created_by=user.id,
        )
        db.add(schedule)
        await db.commit()
        await db.refresh(schedule)

        await log_audit_event(
            db=db,
            action="report:schedule",
            resource_type="report_schedule",
            resource_id=str(schedule.id),
            user_id=user.id,
            workspace_id=workspace_id,
            details={"name": schedule.name, "frequency": schedule.frequency, "recipients": schedule.recipients},
        )

        return ReportScheduleResponse(
            id=schedule.id,
            workspace_id=schedule.workspace_id,
            dashboard_id=schedule.dashboard_id,
            name=schedule.name,
            frequency=schedule.frequency,
            format=schedule.format,
            recipients=schedule.recipients or [],
            status=schedule.status,
            next_run_at=schedule.next_run_at,
            created_at=schedule.created_at,
        )

    @staticmethod
    async def delete_schedule(db: AsyncSession, schedule_id: uuid.UUID, workspace_id: uuid.UUID, user: User) -> dict:
        stmt = select(ReportSchedule).where(ReportSchedule.id == schedule_id, ReportSchedule.workspace_id == workspace_id)
        result = await db.execute(stmt)
        schedule = result.scalar_one_or_none()
        if not schedule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found.")

        await db.delete(schedule)
        await db.commit()

        await log_audit_event(
            db=db,
            action="report:unschedule",
            resource_type="report_schedule",
            resource_id=str(schedule_id),
            user_id=user.id,
            workspace_id=workspace_id,
            details={"name": schedule.name},
        )
        return {"message": "Schedule removed."}

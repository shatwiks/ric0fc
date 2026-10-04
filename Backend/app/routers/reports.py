import os
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.config import settings
from app.models.auth import User
from app.schemas.report import (
    ReportExportCSVRequest,
    ReportExportPDFRequest,
    ReportResponse,
    ReportScheduleCreate,
    ReportScheduleResponse,
)
from app.services.auth_service import get_current_user, require_permission
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["Export Centre & Reports"])

@router.post("/export/csv")
async def export_csv(
    request: ReportExportCSVRequest,
    current_user: User = Depends(require_permission("export:csv")),
    db: AsyncSession = Depends(get_db),
):
    primary_workspace = current_user.organization.workspaces[0] if current_user.organization.workspaces else None
    if not primary_workspace:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active workspace found.")

    file_path, filename, _, _ = await ReportService.export_csv(
        db=db,
        request=request,
        workspace_id=primary_workspace.id,
        user=current_user,
    )

    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Export generation failed.")

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@router.post("/export/pdf")
async def export_pdf(
    request: ReportExportPDFRequest,
    current_user: User = Depends(require_permission("export:pdf")),
    db: AsyncSession = Depends(get_db),
):
    primary_workspace = current_user.organization.workspaces[0] if current_user.organization.workspaces else None
    if not primary_workspace:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active workspace found.")

    file_path, filename, _, _ = await ReportService.export_pdf(
        db=db,
        request=request,
        workspace_id=primary_workspace.id,
        user=current_user,
    )

    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="PDF generation failed.")

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@router.get("", response_model=List[ReportResponse])
async def list_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    primary_workspace = current_user.organization.workspaces[0] if current_user.organization.workspaces else None
    if not primary_workspace:
        return []

    return await ReportService.list_reports(db, primary_workspace.id)

@router.get("/{report_id}/download")
async def download_report(
    report_id: uuid.UUID,
    current_user: User = Depends(require_permission("export:csv")),
    db: AsyncSession = Depends(get_db),
):
    primary_workspace = current_user.organization.workspaces[0] if current_user.organization.workspaces else None
    if not primary_workspace:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active workspace found.")

    report = await ReportService.get_report(db, report_id, primary_workspace.id)
    if not report.file_path or not os.path.exists(report.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report file no longer exists on disk.")

    # Storage boundary escape protection
    upload_root = os.path.abspath(settings.UPLOAD_DIR)
    canonical_file = os.path.abspath(report.file_path)
    if not canonical_file.startswith(upload_root):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: file path escapes allowed storage.")

    media_type = "application/pdf" if report.format == "pdf" else "text/csv"
    ext = "pdf" if report.format == "pdf" else "csv"
    filename = f"{report.name.replace(' ', '_')}.{ext}"

    return FileResponse(
        path=report.file_path,
        filename=filename,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@router.delete("/{report_id}")
async def delete_report(
    report_id: uuid.UUID,
    current_user: User = Depends(require_permission("export:csv")),
    db: AsyncSession = Depends(get_db),
):
    primary_workspace = current_user.organization.workspaces[0] if current_user.organization.workspaces else None
    if not primary_workspace:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active workspace found.")

    return await ReportService.delete_report(db, report_id, primary_workspace.id, current_user)

# Report Schedules
@router.get("/schedules", response_model=List[ReportScheduleResponse])
@router.get("/schedules/all", response_model=List[ReportScheduleResponse])
async def list_report_schedules(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    primary_workspace = current_user.organization.workspaces[0] if current_user.organization.workspaces else None
    if not primary_workspace:
        return []

    return await ReportService.list_schedules(db, primary_workspace.id)

@router.post("/schedules", response_model=ReportScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_report_schedule(
    data: ReportScheduleCreate,
    current_user: User = Depends(require_permission("schedule:reports")),
    db: AsyncSession = Depends(get_db),
):
    primary_workspace = current_user.organization.workspaces[0] if current_user.organization.workspaces else None
    if not primary_workspace:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active workspace found.")

    return await ReportService.create_schedule(db, data, primary_workspace.id, current_user)

@router.delete("/schedules/{schedule_id}")
async def delete_report_schedule(
    schedule_id: uuid.UUID,
    current_user: User = Depends(require_permission("schedule:reports")),
    db: AsyncSession = Depends(get_db),
):
    primary_workspace = current_user.organization.workspaces[0] if current_user.organization.workspaces else None
    if not primary_workspace:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active workspace found.")

    return await ReportService.delete_schedule(db, schedule_id, primary_workspace.id, current_user)

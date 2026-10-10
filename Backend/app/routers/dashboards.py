import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.auth import User, Workspace
from app.schemas.dashboard import (
    DashboardCreate,
    DashboardUpdate,
    DashboardResponse,
    DashboardWidgetCreate,
    DashboardWidgetUpdate,
    DashboardWidgetResponse,
    DashboardFilterCreate,
    DashboardFilterResponse,
    DashboardShareCreate,
    DashboardShareResponse,
    ShareLinkResponse,
)
from app.services.auth_service import get_current_user, get_current_workspace, require_permission
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboards", tags=["Dashboards & Visualization Engine"])

@router.get("/shared/{share_token}", response_model=DashboardResponse)
async def get_shared_dashboard(
    share_token: str,
    db: AsyncSession = Depends(get_db),
):
    """Access a published dashboard via its cryptographic share token."""
    return await DashboardService.get_shared_dashboard(db, share_token)

@router.post("", response_model=DashboardResponse, status_code=status.HTTP_201_CREATED)
async def create_dashboard(
    data: DashboardCreate,
    current_user: User = Depends(require_permission("create:dashboards")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await DashboardService.create_dashboard(
        db=db,
        data=data,
        workspace_id=current_workspace.id,
        user=current_user,
    )

@router.get("", response_model=List[DashboardResponse])
async def list_dashboards(
    current_user: User = Depends(get_current_user),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await DashboardService.list_dashboards(db, current_workspace.id, user=current_user)

@router.get("/{dashboard_id}", response_model=DashboardResponse)
async def get_dashboard(
    dashboard_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await DashboardService.get_dashboard(db, dashboard_id, current_workspace.id, user=current_user)

@router.put("/{dashboard_id}", response_model=DashboardResponse)
async def update_dashboard(
    dashboard_id: uuid.UUID,
    data: DashboardUpdate,
    current_user: User = Depends(require_permission("edit:dashboards")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await DashboardService.update_dashboard(
        db=db,
        dashboard_id=dashboard_id,
        data=data,
        workspace_id=current_workspace.id,
        user=current_user,
    )

@router.delete("/{dashboard_id}")
async def delete_dashboard(
    dashboard_id: uuid.UUID,
    current_user: User = Depends(require_permission("delete:dashboards")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await DashboardService.delete_dashboard(
        db=db,
        dashboard_id=dashboard_id,
        workspace_id=current_workspace.id,
        user=current_user,
    )

# Publishing & Sharing Endpoints
@router.post("/{dashboard_id}/publish", response_model=DashboardResponse)
async def publish_dashboard(
    dashboard_id: uuid.UUID,
    current_user: User = Depends(require_permission("publish:dashboards")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await DashboardService.publish_dashboard(
        db=db,
        dashboard_id=dashboard_id,
        workspace_id=current_workspace.id,
        user=current_user,
    )

@router.post("/{dashboard_id}/unpublish", response_model=DashboardResponse)
async def unpublish_dashboard(
    dashboard_id: uuid.UUID,
    current_user: User = Depends(require_permission("publish:dashboards")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await DashboardService.unpublish_dashboard(
        db=db,
        dashboard_id=dashboard_id,
        workspace_id=current_workspace.id,
        user=current_user,
    )

@router.get("/{dashboard_id}/share-link", response_model=ShareLinkResponse)
@router.post("/{dashboard_id}/share-link", response_model=ShareLinkResponse)
async def get_share_link(
    dashboard_id: uuid.UUID,
    current_user: User = Depends(require_permission("manage:shares")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await DashboardService.get_share_link(
        db=db,
        dashboard_id=dashboard_id,
        workspace_id=current_workspace.id,
        user=current_user,
    )

@router.get("/{dashboard_id}/shares", response_model=List[DashboardShareResponse])
async def list_shares(
    dashboard_id: uuid.UUID,
    current_user: User = Depends(require_permission("manage:shares")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await DashboardService.list_shares(
        db=db,
        dashboard_id=dashboard_id,
        workspace_id=current_workspace.id,
        user=current_user,
    )

@router.post("/{dashboard_id}/shares", response_model=DashboardShareResponse, status_code=status.HTTP_201_CREATED)
async def add_share(
    dashboard_id: uuid.UUID,
    share_data: DashboardShareCreate,
    current_user: User = Depends(require_permission("manage:shares")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await DashboardService.add_share(
        db=db,
        dashboard_id=dashboard_id,
        data=share_data,
        workspace_id=current_workspace.id,
        user=current_user,
    )

@router.delete("/{dashboard_id}/shares/{share_id}")
async def delete_share(
    dashboard_id: uuid.UUID,
    share_id: uuid.UUID,
    current_user: User = Depends(require_permission("manage:shares")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await DashboardService.delete_share(
        db=db,
        dashboard_id=dashboard_id,
        share_id=share_id,
        workspace_id=current_workspace.id,
        user=current_user,
    )

# Widgets
@router.post("/{dashboard_id}/widgets", response_model=DashboardWidgetResponse, status_code=status.HTTP_201_CREATED)
async def add_widget(
    dashboard_id: uuid.UUID,
    widget_data: DashboardWidgetCreate,
    current_user: User = Depends(require_permission("edit:dashboards")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await DashboardService.add_widget(
        db=db,
        dashboard_id=dashboard_id,
        widget_data=widget_data,
        workspace_id=current_workspace.id,
        user=current_user,
    )

@router.put("/{dashboard_id}/widgets/{widget_id}", response_model=DashboardWidgetResponse)
async def update_widget(
    dashboard_id: uuid.UUID,
    widget_id: uuid.UUID,
    widget_data: DashboardWidgetUpdate,
    current_user: User = Depends(require_permission("edit:dashboards")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await DashboardService.update_widget(
        db=db,
        dashboard_id=dashboard_id,
        widget_id=widget_id,
        widget_data=widget_data,
        workspace_id=current_workspace.id,
        user=current_user,
    )

@router.delete("/{dashboard_id}/widgets/{widget_id}")
async def delete_widget(
    dashboard_id: uuid.UUID,
    widget_id: uuid.UUID,
    current_user: User = Depends(require_permission("edit:dashboards")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await DashboardService.delete_widget(
        db=db,
        dashboard_id=dashboard_id,
        widget_id=widget_id,
        workspace_id=current_workspace.id,
        user=current_user,
    )

# Filters
@router.post("/{dashboard_id}/filters", response_model=DashboardFilterResponse, status_code=status.HTTP_201_CREATED)
async def add_filter(
    dashboard_id: uuid.UUID,
    filter_data: DashboardFilterCreate,
    current_user: User = Depends(require_permission("edit:dashboards")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await DashboardService.add_filter(
        db=db,
        dashboard_id=dashboard_id,
        filter_data=filter_data,
        workspace_id=current_workspace.id,
        user=current_user,
    )

@router.delete("/{dashboard_id}/filters/{filter_id}")
async def delete_filter(
    dashboard_id: uuid.UUID,
    filter_id: uuid.UUID,
    current_user: User = Depends(require_permission("edit:dashboards")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await DashboardService.delete_filter(
        db=db,
        dashboard_id=dashboard_id,
        filter_id=filter_id,
        workspace_id=current_workspace.id,
        user=current_user,
    )

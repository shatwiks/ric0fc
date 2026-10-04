import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.auth import User
from app.schemas.governance import (
    UserGovernanceResponse,
    UserRoleUpdateRequest,
    UserStatusUpdateRequest,
    UserInviteRequest,
    AuditLogResponse,
    GovernanceOverviewResponse,
    RolePermissionInfo,
)
from app.services.auth_service import get_current_user, require_permission
from app.services.governance_service import GovernanceService

router = APIRouter(prefix="/governance", tags=["Data Governance & Audit"])

@router.get("/overview", response_model=GovernanceOverviewResponse)
async def get_governance_overview(
    current_user: User = Depends(require_permission("view:audit_logs")),
    db: AsyncSession = Depends(get_db),
):
    primary_workspace = current_user.organization.workspaces[0] if current_user.organization.workspaces else None
    if not primary_workspace:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active workspace found.")

    return await GovernanceService.get_overview(
        db=db,
        organization_id=current_user.organization_id,
        workspace_id=primary_workspace.id,
    )

@router.get("/users", response_model=List[UserGovernanceResponse])
async def list_workspace_users(
    current_user: User = Depends(require_permission("manage:users")),
    db: AsyncSession = Depends(get_db),
):
    return await GovernanceService.list_users(db, current_user.organization_id)

@router.post("/users", response_model=UserGovernanceResponse, status_code=status.HTTP_201_CREATED)
@router.post("/users/invite", response_model=UserGovernanceResponse, status_code=status.HTTP_201_CREATED)
async def invite_workspace_user(
    data: UserInviteRequest,
    current_user: User = Depends(require_permission("manage:users")),
    db: AsyncSession = Depends(get_db),
):
    primary_workspace = current_user.organization.workspaces[0] if current_user.organization.workspaces else None
    if not primary_workspace:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active workspace found.")

    return await GovernanceService.invite_user(
        db=db,
        data=data,
        organization_id=current_user.organization_id,
        workspace_id=primary_workspace.id,
        current_admin=current_user,
    )

@router.put("/users/{user_id}/role", response_model=UserGovernanceResponse)
async def update_user_role(
    user_id: uuid.UUID,
    data: UserRoleUpdateRequest,
    current_user: User = Depends(require_permission("manage:users")),
    db: AsyncSession = Depends(get_db),
):
    primary_workspace = current_user.organization.workspaces[0] if current_user.organization.workspaces else None
    if not primary_workspace:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active workspace found.")

    return await GovernanceService.update_user_role(
        db=db,
        user_id=user_id,
        new_role=data.role,
        organization_id=current_user.organization_id,
        workspace_id=primary_workspace.id,
        current_admin=current_user,
    )

@router.put("/users/{user_id}/status", response_model=UserGovernanceResponse)
async def update_user_status(
    user_id: uuid.UUID,
    data: UserStatusUpdateRequest,
    current_user: User = Depends(require_permission("manage:users")),
    db: AsyncSession = Depends(get_db),
):
    primary_workspace = current_user.organization.workspaces[0] if current_user.organization.workspaces else None
    if not primary_workspace:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active workspace found.")

    return await GovernanceService.update_user_status(
        db=db,
        user_id=user_id,
        is_active=data.is_active,
        organization_id=current_user.organization_id,
        workspace_id=primary_workspace.id,
        current_admin=current_user,
    )

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_permission("manage:users")),
    db: AsyncSession = Depends(get_db),
):
    primary_workspace = current_user.organization.workspaces[0] if current_user.organization.workspaces else None
    if not primary_workspace:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active workspace found.")

    return await GovernanceService.delete_user(
        db=db,
        user_id=user_id,
        organization_id=current_user.organization_id,
        workspace_id=primary_workspace.id,
        current_admin=current_user,
    )

@router.get("/roles", response_model=List[RolePermissionInfo])
async def get_roles(current_user: User = Depends(get_current_user)):
    return GovernanceService.get_role_definitions()

@router.get("/audit-logs", response_model=List[AuditLogResponse])
async def list_audit_logs(
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    user_id: Optional[uuid.UUID] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(require_permission("view:audit_logs")),
    db: AsyncSession = Depends(get_db),
):
    primary_workspace = current_user.organization.workspaces[0] if current_user.organization.workspaces else None
    if not primary_workspace:
        return []

    return await GovernanceService.get_audit_logs(
        db=db,
        workspace_id=primary_workspace.id,
        action=action,
        resource_type=resource_type,
        user_id=user_id,
        limit=limit,
        offset=offset,
    )

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.auth import User, Workspace
from app.schemas.governance import (
    UserGovernanceResponse,
    UserRoleUpdateRequest,
    UserStatusUpdateRequest,
    UserInviteRequest,
    AuditLogResponse,
    GovernanceOverviewResponse,
    RolePermissionInfo,
)
from app.schemas.auth import (
    OrganizationOverviewResponse,
    OrganizationUpdateRequest,
    OrganizationInvitationCreateRequest,
    OrganizationInvitationResponse,
)
from app.services.auth_service import (
    get_current_user,
    get_current_workspace,
    require_permission,
    AuthService,
)
from app.services.governance_service import GovernanceService

router = APIRouter(prefix="/governance", tags=["Data Governance & Audit"])

@router.get("/organization", response_model=OrganizationOverviewResponse)
async def get_organization_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full organization metadata, usage metrics, and workspace breakdown."""
    return await GovernanceService.get_organization_overview(db, current_user.organization_id)

@router.put("/organization", response_model=OrganizationOverviewResponse)
async def update_organization(
    data: OrganizationUpdateRequest,
    current_user: User = Depends(require_permission("manage:workspaces")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Update organization profile, company size, and industry classification."""
    return await GovernanceService.update_organization(
        db=db,
        organization_id=current_user.organization_id,
        data=data,
        current_admin=current_user,
        workspace_id=current_workspace.id,
    )

@router.get("/overview", response_model=GovernanceOverviewResponse)
async def get_governance_overview(
    current_user: User = Depends(require_permission("view:audit_logs")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await GovernanceService.get_overview(
        db=db,
        organization_id=current_user.organization_id,
        workspace_id=current_workspace.id,
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
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Direct user creation/provisioning (backward compatible with tests)."""
    return await GovernanceService.invite_user(
        db=db,
        data=data,
        organization_id=current_user.organization_id,
        workspace_id=current_workspace.id,
        current_admin=current_user,
    )

@router.get("/invitations", response_model=List[OrganizationInvitationResponse])
async def list_organization_invitations(
    current_user: User = Depends(require_permission("manage:users")),
    db: AsyncSession = Depends(get_db),
):
    """List pending and sent invitation tokens for employee onboarding."""
    return await AuthService.list_invitations(db, current_user.organization_id)

@router.post("/invitations", response_model=OrganizationInvitationResponse, status_code=status.HTTP_201_CREATED)
async def create_organization_invitation(
    data: OrganizationInvitationCreateRequest,
    current_user: User = Depends(require_permission("manage:users")),
    db: AsyncSession = Depends(get_db),
):
    """Generate a secure cryptographic invitation link for a new employee."""
    return await AuthService.create_invitation(db, current_user, data)

@router.post("/invitations/{invitation_id}/resend", response_model=OrganizationInvitationResponse)
async def resend_invitation(
    invitation_id: uuid.UUID,
    current_user: User = Depends(require_permission("manage:users")),
    db: AsyncSession = Depends(get_db),
):
    """Refresh and re-issue a secure invitation token."""
    return await AuthService.resend_invitation(db, invitation_id, current_user)

@router.post("/invitations/{invitation_id}/revoke")
@router.delete("/invitations/{invitation_id}")
async def revoke_invitation(
    invitation_id: uuid.UUID,
    current_user: User = Depends(require_permission("manage:users")),
    db: AsyncSession = Depends(get_db),
):
    """Revoke an active invitation token."""
    return await AuthService.revoke_invitation(db, invitation_id, current_user)

@router.put("/users/{user_id}/role", response_model=UserGovernanceResponse)
async def update_user_role(
    user_id: uuid.UUID,
    data: UserRoleUpdateRequest,
    current_user: User = Depends(require_permission("manage:users")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await GovernanceService.update_user_role(
        db=db,
        user_id=user_id,
        new_role=data.role,
        organization_id=current_user.organization_id,
        workspace_id=current_workspace.id,
        current_admin=current_user,
    )

@router.put("/users/{user_id}/status", response_model=UserGovernanceResponse)
async def update_user_status(
    user_id: uuid.UUID,
    data: UserStatusUpdateRequest,
    current_user: User = Depends(require_permission("manage:users")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await GovernanceService.update_user_status(
        db=db,
        user_id=user_id,
        is_active=data.is_active,
        organization_id=current_user.organization_id,
        workspace_id=current_workspace.id,
        current_admin=current_user,
    )

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_permission("manage:users")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await GovernanceService.delete_user(
        db=db,
        user_id=user_id,
        organization_id=current_user.organization_id,
        workspace_id=current_workspace.id,
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
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await GovernanceService.get_audit_logs(
        db=db,
        workspace_id=current_workspace.id,
        action=action,
        resource_type=resource_type,
        user_id=user_id,
        limit=limit,
        offset=offset,
    )

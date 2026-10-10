from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.schemas.auth import (
    UserSignupRequest,
    UserLoginRequest,
    TokenResponse,
    AuthMeResponse,
    UserResponse,
    OrganizationResponse,
    WorkspaceResponse,
    CreateWorkspaceRequest,
    SwitchContextRequest,
    OrganizationSummary,
    InvitationPublicDetails,
    AcceptInvitationRequest,
)
from app.services.auth_service import AuthService, get_current_user, get_current_workspace
from app.services.audit_service import log_audit_event
from app.utils.security import get_role_permissions
from app.models.auth import User, Workspace, OrganizationMember

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    request: UserSignupRequest,
    req: Request,
    db: AsyncSession = Depends(get_db),
):
    client_ip = req.client.host if req.client else None
    return await AuthService.signup(db, request, client_ip)

@router.post("/login", response_model=TokenResponse)
async def login(
    request: UserLoginRequest,
    req: Request,
    db: AsyncSession = Depends(get_db),
):
    client_ip = req.client.host if req.client else None
    return await AuthService.login(db, request, client_ip)

@router.get("/me", response_model=AuthMeResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    org = current_user.organization
    org_summaries = await AuthService.get_user_organizations_summary(db, current_user)

    return AuthMeResponse(
        user=UserResponse.model_validate(current_user),
        organization=OrganizationResponse.model_validate(org),
        workspace=WorkspaceResponse.model_validate(current_workspace),
        organizations=org_summaries,
        permissions=get_role_permissions(current_user.role),
    )

@router.post("/switch-context", response_model=TokenResponse)
async def switch_context(
    request: SwitchContextRequest,
    req: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    client_ip = req.client.host if req.client else None
    return await AuthService.switch_context(db, current_user, request, client_ip)

@router.get("/organizations", response_model=List[OrganizationSummary])
async def list_user_organizations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AuthService.get_user_organizations_summary(db, current_user)

@router.get("/invitations/{token}", response_model=InvitationPublicDetails)
async def get_invitation_public(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint to validate an invitation token before user acceptance."""
    return await AuthService.get_invitation_public_details(db, token)

@router.post("/invitations/{token}/accept", response_model=TokenResponse)
async def accept_invitation(
    token: str,
    request: AcceptInvitationRequest,
    req: Request,
    db: AsyncSession = Depends(get_db),
):
    """Accept an invitation, register/link user account, and return authenticated session."""
    client_ip = req.client.host if req.client else None
    return await AuthService.accept_invitation(db, token, request, client_ip)

@router.post("/logout")
async def logout(
    req: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    client_ip = req.client.host if req.client else None
    primary_workspace = current_user.organization.workspaces[0] if (current_user.organization and current_user.organization.workspaces) else None
    workspace_id = primary_workspace.id if primary_workspace else current_user.organization.id

    await log_audit_event(
        db=db,
        action="auth:logout",
        resource_type="user",
        resource_id=str(current_user.id),
        user_id=current_user.id,
        workspace_id=workspace_id,
        details={"email": current_user.email},
        ip_address=client_ip,
    )
    return {"message": "Successfully logged out of RicozViz."}

@router.post("/workspaces", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    request: CreateWorkspaceRequest,
    req: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import re
    import uuid
    slug_base = re.sub(r"[^a-z0-9]+", "-", request.name.lower()).strip("-")
    if not slug_base:
        slug_base = "workspace"
    slug = f"{slug_base}-{uuid.uuid4().hex[:6]}"

    new_ws = Workspace(
        organization_id=current_user.organization_id,
        name=request.name.strip(),
        slug=slug,
    )
    db.add(new_ws)
    await db.commit()
    await db.refresh(new_ws)

    client_ip = req.client.host if req.client else None
    await log_audit_event(
        db=db,
        action="workspace:create",
        resource_type="workspace",
        resource_id=str(new_ws.id),
        user_id=current_user.id,
        workspace_id=new_ws.id,
        details={"name": new_ws.name, "slug": new_ws.slug},
        ip_address=client_ip,
    )
    return WorkspaceResponse.model_validate(new_ws)

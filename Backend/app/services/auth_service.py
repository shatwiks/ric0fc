import re
import uuid
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Callable
from fastapi import Request, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.auth import (
    User,
    Organization,
    Workspace,
    UserRole,
    OrganizationMember,
    OrganizationInvitation,
)
from app.schemas.auth import (
    UserSignupRequest,
    UserLoginRequest,
    TokenResponse,
    AuthMeResponse,
    UserResponse,
    OrganizationResponse,
    WorkspaceResponse,
    OrganizationSummary,
    SwitchContextRequest,
    OrganizationInvitationCreateRequest,
    OrganizationInvitationResponse,
    InvitationPublicDetails,
    AcceptInvitationRequest,
)
from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    get_role_permissions,
)
from app.services.audit_service import log_audit_event
from app.config import settings

security_bearer = HTTPBearer(auto_error=False)

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    text = re.sub(r'^-+|-+$', '', text)
    return text or "default"

class AuthService:
    @staticmethod
    async def get_user_organizations_summary(db: AsyncSession, user: User) -> List[OrganizationSummary]:
        """Fetches all organizations the user is an active member of, including their workspaces."""
        # Find all organization memberships
        stmt = (
            select(OrganizationMember)
            .options(
                selectinload(OrganizationMember.organization).selectinload(Organization.workspaces)
            )
            .where(
                OrganizationMember.user_id == user.id,
                OrganizationMember.is_active == True,
            )
        )
        res = await db.execute(stmt)
        memberships = res.scalars().all()

        summaries: List[OrganizationSummary] = []
        seen_org_ids = set()

        for m in memberships:
            org = m.organization
            if not org or org.id in seen_org_ids:
                continue
            seen_org_ids.add(org.id)
            summaries.append(
                OrganizationSummary(
                    id=org.id,
                    name=org.name,
                    slug=org.slug,
                    plan=org.plan,
                    role=m.role.value,
                    company_size=org.company_size,
                    industry=org.industry,
                    workspaces=[WorkspaceResponse.model_validate(w) for w in (org.workspaces or [])],
                )
            )

        # Ensure user's primary organization is included if not yet present
        if user.organization_id not in seen_org_ids:
            org_stmt = (
                select(Organization)
                .options(selectinload(Organization.workspaces))
                .where(Organization.id == user.organization_id)
            )
            org_res = await db.execute(org_stmt)
            primary_org = org_res.scalar_one_or_none()
            if primary_org:
                summaries.append(
                    OrganizationSummary(
                        id=primary_org.id,
                        name=primary_org.name,
                        slug=primary_org.slug,
                        plan=primary_org.plan,
                        role=user.role.value,
                        company_size=primary_org.company_size,
                        industry=primary_org.industry,
                        workspaces=[WorkspaceResponse.model_validate(w) for w in (primary_org.workspaces or [])],
                    )
                )

        return summaries

    @staticmethod
    async def signup(db: AsyncSession, request: UserSignupRequest, client_ip: Optional[str] = None) -> TokenResponse:
        # 1. Check if email already registered
        query = select(User).where(User.email == request.email.lower().strip())
        result = await db.execute(query)
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists.",
            )

        # 2. Create organization
        org_slug_base = slugify(request.organization_name)
        org_slug = f"{org_slug_base}-{uuid.uuid4().hex[:6]}"
        org = Organization(
            name=request.organization_name.strip(),
            slug=org_slug,
            plan="enterprise",
            company_size=request.company_size,
            industry=request.industry,
        )
        db.add(org)
        await db.flush()

        # 3. Create default workspace
        workspace = Workspace(
            organization_id=org.id,
            name="Main Analytics Workspace",
            slug="main",
        )
        db.add(workspace)
        await db.flush()

        # 4. Create user
        user = User(
            organization_id=org.id,
            email=request.email.lower().strip(),
            password_hash=hash_password(request.password),
            full_name=request.full_name.strip(),
            role=request.role or UserRole.ADMIN,
            is_active=True,
        )
        db.add(user)
        await db.flush()

        # 5. Create OrganizationMember entry
        member = OrganizationMember(
            organization_id=org.id,
            user_id=user.id,
            role=user.role,
            is_active=True,
        )
        db.add(member)
        await db.flush()
        await db.commit()

        # 6. Log audit event
        await log_audit_event(
            db=db,
            action="auth:signup",
            resource_type="user",
            resource_id=str(user.id),
            user_id=user.id,
            workspace_id=workspace.id,
            details={"email": user.email, "organization": org.name, "role": user.role.value},
            ip_address=client_ip,
        )

        # 7. Issue JWT token
        token_payload = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "org_id": str(org.id),
            "workspace_id": str(workspace.id),
        }
        access_token = create_access_token(token_payload)

        org_summaries = [
            OrganizationSummary(
                id=org.id,
                name=org.name,
                slug=org.slug,
                plan=org.plan,
                role=user.role.value,
                company_size=org.company_size,
                industry=org.industry,
                workspaces=[WorkspaceResponse.model_validate(workspace)],
            )
        ]

        return TokenResponse(
            access_token=access_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role.value,
            organization_id=org.id,
            organization_name=org.name,
            workspace_id=workspace.id,
            workspace_name=workspace.name,
            organizations=org_summaries,
        )

    @staticmethod
    async def login(db: AsyncSession, request: UserLoginRequest, client_ip: Optional[str] = None) -> TokenResponse:
        query = (
            select(User)
            .options(
                selectinload(User.organization).selectinload(Organization.workspaces),
                selectinload(User.memberships),
            )
            .where(User.email == request.email.lower().strip())
        )
        result = await db.execute(query)
        user = result.scalar_one_or_none()

        if not user or not verify_password(request.password, user.password_hash):
            await log_audit_event(
                db=db,
                action="auth:login_failed",
                resource_type="auth",
                resource_id=request.email.lower().strip()[:100],
                user_id=user.id if user else None,
                workspace_id=user.organization.workspaces[0].id if (user and user.organization and user.organization.workspaces) else None,
                details={"email": request.email.lower().strip()[:100], "reason": "invalid_credentials"},
                ip_address=client_ip,
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            await log_audit_event(
                db=db,
                action="auth:login_failed",
                resource_type="auth",
                resource_id=str(user.id),
                user_id=user.id,
                workspace_id=user.organization.workspaces[0].id if (user.organization and user.organization.workspaces) else None,
                details={"email": user.email, "reason": "account_deactivated"},
                ip_address=client_ip,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated. Contact organization administrator.",
            )

        org = user.organization
        workspace = org.workspaces[0] if (org and org.workspaces) else None
        workspace_id = workspace.id if workspace else org.id
        workspace_name = workspace.name if workspace else "Default Workspace"

        # Log audit event
        await log_audit_event(
            db=db,
            action="auth:login",
            resource_type="user",
            resource_id=str(user.id),
            user_id=user.id,
            workspace_id=workspace_id,
            details={"email": user.email},
            ip_address=client_ip,
        )

        token_payload = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "org_id": str(org.id),
            "workspace_id": str(workspace_id),
        }
        access_token = create_access_token(token_payload)
        org_summaries = await AuthService.get_user_organizations_summary(db, user)

        return TokenResponse(
            access_token=access_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role.value,
            organization_id=org.id,
            organization_name=org.name,
            workspace_id=workspace_id,
            workspace_name=workspace_name,
            organizations=org_summaries,
        )

    @staticmethod
    async def switch_context(
        db: AsyncSession,
        user: User,
        data: SwitchContextRequest,
        client_ip: Optional[str] = None,
    ) -> TokenResponse:
        """Securely switch active organization and workspace context for a multi-tenant user."""
        target_org_id = data.organization_id

        # Verify user is member of target organization
        is_member = (user.organization_id == target_org_id)
        user_role = user.role

        if not is_member:
            mem_stmt = select(OrganizationMember).where(
                OrganizationMember.user_id == user.id,
                OrganizationMember.organization_id == target_org_id,
                OrganizationMember.is_active == True,
            )
            mem_res = await db.execute(mem_stmt)
            mem = mem_res.scalar_one_or_none()
            if mem:
                is_member = True
                user_role = mem.role

        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not an active member of this organization.",
            )

        # Fetch target organization and workspaces
        org_stmt = (
            select(Organization)
            .options(selectinload(Organization.workspaces))
            .where(Organization.id == target_org_id)
        )
        org_res = await db.execute(org_stmt)
        target_org = org_res.scalar_one_or_none()
        if not target_org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

        # Determine target workspace
        target_workspace = None
        if data.workspace_id:
            for w in (target_org.workspaces or []):
                if w.id == data.workspace_id:
                    target_workspace = w
                    break
            if not target_workspace:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workspace not found in the selected organization.",
                )
        else:
            target_workspace = target_org.workspaces[0] if target_org.workspaces else None

        workspace_id = target_workspace.id if target_workspace else target_org.id
        workspace_name = target_workspace.name if target_workspace else "Default Workspace"

        # Update primary org pointer on user model
        user.organization_id = target_org.id
        user.role = user_role
        await db.commit()

        token_payload = {
            "sub": str(user.id),
            "email": user.email,
            "role": user_role.value,
            "org_id": str(target_org.id),
            "workspace_id": str(workspace_id),
        }
        access_token = create_access_token(token_payload)
        org_summaries = await AuthService.get_user_organizations_summary(db, user)

        await log_audit_event(
            db=db,
            action="auth:switch_organization",
            resource_type="organization",
            resource_id=str(target_org.id),
            user_id=user.id,
            workspace_id=workspace_id,
            details={"organization_name": target_org.name, "workspace_name": workspace_name},
            ip_address=client_ip,
        )

        return TokenResponse(
            access_token=access_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user_role.value,
            organization_id=target_org.id,
            organization_name=target_org.name,
            workspace_id=workspace_id,
            workspace_name=workspace_name,
            organizations=org_summaries,
        )

    @staticmethod
    async def create_invitation(
        db: AsyncSession,
        admin_user: User,
        data: OrganizationInvitationCreateRequest,
    ) -> OrganizationInvitationResponse:
        """Create a cryptographic employee invitation token for the organization."""
        org_id = admin_user.organization_id
        email_clean = data.email.lower().strip()

        # Check if already active member in this org
        existing_user_res = await db.execute(
            select(User).where(User.email == email_clean, User.organization_id == org_id)
        )
        if existing_user_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email is already a member of your organization.",
            )

        # Check existing membership
        mem_check = await db.execute(
            select(OrganizationMember)
            .join(User)
            .where(User.email == email_clean, OrganizationMember.organization_id == org_id)
        )
        if mem_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email is already a member of your organization.",
            )

        # Generate cryptographic 256-bit token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)

        # Revoke existing pending invites for this email in this org
        existing_invites_res = await db.execute(
            select(OrganizationInvitation).where(
                OrganizationInvitation.organization_id == org_id,
                OrganizationInvitation.email == email_clean,
                OrganizationInvitation.status == "pending",
            )
        )
        for inv in existing_invites_res.scalars().all():
            inv.status = "revoked"

        new_invitation = OrganizationInvitation(
            organization_id=org_id,
            workspace_id=data.workspace_id,
            email=email_clean,
            role=data.role,
            token=token,
            status="pending",
            invited_by_id=admin_user.id,
            created_at=datetime.now(timezone.utc),
            expires_at=expires_at,
        )
        db.add(new_invitation)
        await db.commit()
        await db.refresh(new_invitation)

        # Resolve org and workspace names
        org = admin_user.organization
        ws_name = None
        if data.workspace_id and org and org.workspaces:
            for w in org.workspaces:
                if w.id == data.workspace_id:
                    ws_name = w.name
                    break

        await log_audit_event(
            db=db,
            action="governance:invitation_create",
            resource_type="invitation",
            resource_id=str(new_invitation.id),
            user_id=admin_user.id,
            workspace_id=data.workspace_id or (org.workspaces[0].id if org and org.workspaces else org_id),
            details={"email": email_clean, "role": data.role.value},
        )

        return OrganizationInvitationResponse(
            id=new_invitation.id,
            organization_id=org_id,
            organization_name=org.name if org else "Enterprise",
            workspace_id=new_invitation.workspace_id,
            workspace_name=ws_name,
            email=new_invitation.email,
            role=new_invitation.role.value,
            token=new_invitation.token,
            status=new_invitation.status,
            invited_by_name=admin_user.full_name,
            created_at=new_invitation.created_at,
            expires_at=new_invitation.expires_at,
            invite_url=f"/invite/{new_invitation.token}",
        )

    @staticmethod
    async def list_invitations(
        db: AsyncSession,
        organization_id: uuid.UUID,
    ) -> List[OrganizationInvitationResponse]:
        stmt = (
            select(OrganizationInvitation)
            .options(
                selectinload(OrganizationInvitation.organization),
                selectinload(OrganizationInvitation.workspace),
                selectinload(OrganizationInvitation.inviter),
            )
            .where(OrganizationInvitation.organization_id == organization_id)
            .order_by(OrganizationInvitation.created_at.desc())
        )
        res = await db.execute(stmt)
        invites = res.scalars().all()

        now = datetime.now(timezone.utc)
        results: List[OrganizationInvitationResponse] = []
        for inv in invites:
            status_val = inv.status
            if status_val == "pending" and inv.expires_at < now:
                status_val = "expired"

            results.append(
                OrganizationInvitationResponse(
                    id=inv.id,
                    organization_id=inv.organization_id,
                    organization_name=inv.organization.name if inv.organization else "Organization",
                    workspace_id=inv.workspace_id,
                    workspace_name=inv.workspace.name if inv.workspace else None,
                    email=inv.email,
                    role=inv.role.value,
                    token=inv.token,
                    status=status_val,
                    invited_by_name=inv.inviter.full_name if inv.inviter else None,
                    created_at=inv.created_at,
                    expires_at=inv.expires_at,
                    invite_url=f"/invite/{inv.token}",
                )
            )
        return results

    @staticmethod
    async def resend_invitation(
        db: AsyncSession,
        invitation_id: uuid.UUID,
        admin_user: User,
    ) -> OrganizationInvitationResponse:
        stmt = (
            select(OrganizationInvitation)
            .options(selectinload(OrganizationInvitation.organization))
            .where(
                OrganizationInvitation.id == invitation_id,
                OrganizationInvitation.organization_id == admin_user.organization_id,
            )
        )
        res = await db.execute(stmt)
        inv = res.scalar_one_or_none()
        if not inv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found.")

        inv.token = secrets.token_urlsafe(32)
        inv.expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        inv.status = "pending"
        await db.commit()
        await db.refresh(inv)

        await log_audit_event(
            db=db,
            action="governance:invitation_resend",
            resource_type="invitation",
            resource_id=str(inv.id),
            user_id=admin_user.id,
            workspace_id=inv.workspace_id or admin_user.organization.workspaces[0].id,
            details={"email": inv.email},
        )

        return OrganizationInvitationResponse(
            id=inv.id,
            organization_id=inv.organization_id,
            organization_name=inv.organization.name if inv.organization else "Enterprise",
            workspace_id=inv.workspace_id,
            workspace_name=None,
            email=inv.email,
            role=inv.role.value,
            token=inv.token,
            status=inv.status,
            invited_by_name=admin_user.full_name,
            created_at=inv.created_at,
            expires_at=inv.expires_at,
            invite_url=f"/invite/{inv.token}",
        )

    @staticmethod
    async def revoke_invitation(
        db: AsyncSession,
        invitation_id: uuid.UUID,
        admin_user: User,
    ) -> dict:
        stmt = select(OrganizationInvitation).where(
            OrganizationInvitation.id == invitation_id,
            OrganizationInvitation.organization_id == admin_user.organization_id,
        )
        res = await db.execute(stmt)
        inv = res.scalar_one_or_none()
        if not inv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found.")

        inv.status = "revoked"
        await db.commit()

        await log_audit_event(
            db=db,
            action="governance:invitation_revoke",
            resource_type="invitation",
            resource_id=str(inv.id),
            user_id=admin_user.id,
            workspace_id=inv.workspace_id or admin_user.organization.workspaces[0].id,
            details={"email": inv.email},
        )

        return {"message": "Invitation revoked successfully."}

    @staticmethod
    async def get_invitation_public_details(
        db: AsyncSession,
        token: str,
    ) -> InvitationPublicDetails:
        stmt = (
            select(OrganizationInvitation)
            .options(
                selectinload(OrganizationInvitation.organization),
                selectinload(OrganizationInvitation.inviter),
            )
            .where(OrganizationInvitation.token == token.strip())
        )
        res = await db.execute(stmt)
        inv = res.scalar_one_or_none()
        if not inv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid invitation token.")

        now = datetime.now(timezone.utc)
        is_valid = (inv.status == "pending" and inv.expires_at > now)

        return InvitationPublicDetails(
            token=inv.token,
            email=inv.email,
            organization_name=inv.organization.name if inv.organization else "Enterprise",
            role=inv.role.value,
            invited_by_name=inv.inviter.full_name if inv.inviter else None,
            is_valid=is_valid,
            expires_at=inv.expires_at,
        )

    @staticmethod
    async def accept_invitation(
        db: AsyncSession,
        token: str,
        data: AcceptInvitationRequest,
        client_ip: Optional[str] = None,
    ) -> TokenResponse:
        stmt = (
            select(OrganizationInvitation)
            .options(
                selectinload(OrganizationInvitation.organization).selectinload(Organization.workspaces),
                selectinload(OrganizationInvitation.workspace),
            )
            .where(OrganizationInvitation.token == token.strip())
        )
        res = await db.execute(stmt)
        inv = res.scalar_one_or_none()

        if not inv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found.")

        now = datetime.now(timezone.utc)
        if inv.status != "pending" or inv.expires_at <= now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This invitation token has expired or has already been used/revoked.",
            )

        org = inv.organization
        if not org:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Associated organization not found.")

        workspace = inv.workspace or (org.workspaces[0] if org.workspaces else None)
        workspace_id = workspace.id if workspace else org.id
        workspace_name = workspace.name if workspace else "Main Workspace"

        # Check if user already exists with this email
        user_stmt = select(User).where(User.email == inv.email.lower().strip())
        user_res = await db.execute(user_stmt)
        user = user_res.scalar_one_or_none()

        if user:
            # User already exists in another tenant: link to this org
            user.password_hash = hash_password(data.password)
            user.full_name = data.full_name.strip()
            user.organization_id = org.id
            user.role = inv.role
            user.is_active = True
        else:
            # Create new user
            user = User(
                organization_id=org.id,
                email=inv.email.lower().strip(),
                password_hash=hash_password(data.password),
                full_name=data.full_name.strip(),
                role=inv.role,
                is_active=True,
            )
            db.add(user)
            await db.flush()

        # Add or update OrganizationMember
        mem_stmt = select(OrganizationMember).where(
            OrganizationMember.user_id == user.id,
            OrganizationMember.organization_id == org.id,
        )
        mem_res = await db.execute(mem_stmt)
        mem = mem_res.scalar_one_or_none()
        if mem:
            mem.role = inv.role
            mem.is_active = True
        else:
            db.add(
                OrganizationMember(
                    organization_id=org.id,
                    user_id=user.id,
                    role=inv.role,
                    is_active=True,
                )
            )

        # Mark invitation as accepted
        inv.status = "accepted"
        await db.commit()
        await db.refresh(user)

        # Log audit event
        await log_audit_event(
            db=db,
            action="auth:invitation_accept",
            resource_type="invitation",
            resource_id=str(inv.id),
            user_id=user.id,
            workspace_id=workspace_id,
            details={"email": user.email, "organization": org.name, "role": inv.role.value},
            ip_address=client_ip,
        )

        token_payload = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "org_id": str(org.id),
            "workspace_id": str(workspace_id),
        }
        access_token = create_access_token(token_payload)
        org_summaries = await AuthService.get_user_organizations_summary(db, user)

        return TokenResponse(
            access_token=access_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role.value,
            organization_id=org.id,
            organization_name=org.name,
            workspace_id=workspace_id,
            workspace_name=workspace_name,
            organizations=org_summaries,
        )

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = uuid.UUID(payload["sub"])
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token user identifier.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    query = (
        select(User)
        .options(
            selectinload(User.organization).selectinload(Organization.workspaces),
            selectinload(User.memberships),
        )
        .where(User.id == user_id)
    )
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    return user

async def get_current_workspace(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Workspace:
    """Derives tenant workspace context from user session with strict cross-tenant verification."""
    # Check X-Workspace-Id header from client
    ws_header = request.headers.get("x-workspace-id")
    if ws_header:
        try:
            ws_id = uuid.UUID(ws_header.strip())
            # Fetch workspace
            stmt = select(Workspace).where(Workspace.id == ws_id)
            res = await db.execute(stmt)
            target_ws = res.scalar_one_or_none()
            if not target_ws:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")

            # Validate that workspace belongs to current user's organization
            is_authorized = (target_ws.organization_id == current_user.organization_id)
            if not is_authorized:
                # Check user memberships in other organizations
                mem_stmt = select(OrganizationMember).where(
                    OrganizationMember.user_id == current_user.id,
                    OrganizationMember.organization_id == target_ws.organization_id,
                    OrganizationMember.is_active == True,
                )
                mem_res = await db.execute(mem_stmt)
                if mem_res.scalar_one_or_none():
                    is_authorized = True

            if not is_authorized:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cross-tenant access forbidden. Workspace does not belong to your organization.",
                )

            return target_ws
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid workspace ID format.")

    # Default to primary workspace in user's active organization
    if current_user.organization and current_user.organization.workspaces:
        return current_user.organization.workspaces[0]

    # Query from database
    stmt = (
        select(Workspace)
        .where(Workspace.organization_id == current_user.organization_id)
        .order_by(Workspace.created_at.asc())
    )
    res = await db.execute(stmt)
    primary = res.scalar_one_or_none()
    if not primary:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active workspace found for user organization.",
        )
    return primary

def require_role(allowed_roles: List[UserRole]) -> Callable:
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role == UserRole.ADMIN:
            return current_user
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {[r.value for r in allowed_roles]}",
            )
        return current_user
    return role_checker

def require_permission(required_permission: str) -> Callable:
    async def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        user_permissions = get_role_permissions(current_user.role)
        if "*" in user_permissions or required_permission in user_permissions:
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Missing permission: '{required_permission}'",
        )
    return permission_checker

import re
import uuid
from typing import Optional, List, Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.auth import User, Organization, Workspace, UserRole
from app.schemas.auth import UserSignupRequest, UserLoginRequest, TokenResponse, AuthMeResponse, UserResponse, OrganizationResponse, WorkspaceResponse
from app.utils.security import hash_password, verify_password, create_access_token, decode_access_token, get_role_permissions
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
        await db.commit()

        # 5. Log audit event
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

        # 6. Issue JWT token
        token_payload = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "org_id": str(org.id),
            "workspace_id": str(workspace.id),
        }
        access_token = create_access_token(token_payload)

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
        )

    @staticmethod
    async def login(db: AsyncSession, request: UserLoginRequest, client_ip: Optional[str] = None) -> TokenResponse:
        query = (
            select(User)
            .options(selectinload(User.organization).selectinload(Organization.workspaces))
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
        workspace = org.workspaces[0] if org.workspaces else None
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
        .options(selectinload(User.organization).selectinload(Organization.workspaces))
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

def require_role(allowed_roles: List[UserRole]) -> Callable:
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role == UserRole.ADMIN:
            return current_user  # Admin has access to all roles
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

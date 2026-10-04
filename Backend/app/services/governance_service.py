import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models.auth import User, Organization, Workspace, UserRole
from app.models.data import Dataset
from app.models.dashboard import Dashboard
from app.models.governance import AuditLog
from app.schemas.governance import (
    UserGovernanceResponse,
    UserRoleUpdateRequest,
    UserStatusUpdateRequest,
    UserInviteRequest,
    AuditLogResponse,
    GovernanceOverviewResponse,
    RolePermissionInfo,
)
from app.utils.security import hash_password, ROLE_PERMISSIONS
from app.services.audit_service import log_audit_event

ROLE_DESCRIPTIONS = {
    UserRole.VIEWER: "Read-only access to published dashboards and reports. Can export CSV and PDF extracts.",
    UserRole.EXPLORER: "Viewer permissions plus ad-hoc dataset exploratory querying and analytical slicing.",
    UserRole.ANALYST: "Full analytics authoring: upload datasets, build charts, compose and edit dashboards.",
    UserRole.PUBLISHER: "Analyst permissions plus official dashboard publishing, link sharing, and scheduled reports.",
    UserRole.ADMIN: "Full platform governance: user management, role assignments, audit logs, and workspace policies.",
}

class GovernanceService:
    @staticmethod
    async def list_users(db: AsyncSession, organization_id: uuid.UUID) -> List[UserGovernanceResponse]:
        stmt = (
            select(User)
            .where(User.organization_id == organization_id)
            .order_by(User.created_at.asc())
        )
        result = await db.execute(stmt)
        users = result.scalars().all()
        return [
            UserGovernanceResponse(
                id=u.id,
                full_name=u.full_name,
                email=u.email,
                role=u.role.value,
                is_active=u.is_active,
                created_at=u.created_at,
            )
            for u in users
        ]

    @staticmethod
    async def invite_user(
        db: AsyncSession,
        data: UserInviteRequest,
        organization_id: uuid.UUID,
        workspace_id: uuid.UUID,
        current_admin: User,
    ) -> UserGovernanceResponse:
        email = data.email.lower().strip()
        existing = await db.execute(select(User).where(User.email == email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A user with this email address already exists.")

        new_user = User(
            organization_id=organization_id,
            email=email,
            password_hash=hash_password(data.password),
            full_name=data.full_name.strip(),
            role=data.role,
            is_active=True,
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        await log_audit_event(
            db=db,
            action="governance:user_add",
            resource_type="user",
            resource_id=str(new_user.id),
            user_id=current_admin.id,
            workspace_id=workspace_id,
            details={"email": new_user.email, "role": new_user.role.value, "full_name": new_user.full_name},
        )

        return UserGovernanceResponse(
            id=new_user.id,
            full_name=new_user.full_name,
            email=new_user.email,
            role=new_user.role.value,
            is_active=new_user.is_active,
            created_at=new_user.created_at,
        )

    @staticmethod
    async def update_user_role(
        db: AsyncSession,
        user_id: uuid.UUID,
        new_role: UserRole,
        organization_id: uuid.UUID,
        workspace_id: uuid.UUID,
        current_admin: User,
    ) -> UserGovernanceResponse:
        stmt = select(User).where(User.id == user_id, User.organization_id == organization_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        # Prevent demoting last active Admin in org
        if user.role == UserRole.ADMIN and new_role != UserRole.ADMIN:
            admin_count_res = await db.execute(
                select(func.count(User.id)).where(User.organization_id == organization_id, User.role == UserRole.ADMIN, User.is_active == True)
            )
            admin_count = admin_count_res.scalar() or 0
            if admin_count <= 1:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot demote the last organization administrator.")

        old_role = user.role.value
        user.role = new_role
        await db.commit()
        await db.refresh(user)

        await log_audit_event(
            db=db,
            action="governance:role_change",
            resource_type="user",
            resource_id=str(user.id),
            user_id=current_admin.id,
            workspace_id=workspace_id,
            details={"user_email": user.email, "old_role": old_role, "new_role": new_role.value},
        )

        return UserGovernanceResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            role=user.role.value,
            is_active=user.is_active,
            created_at=user.created_at,
        )

    @staticmethod
    async def update_user_status(
        db: AsyncSession,
        user_id: uuid.UUID,
        is_active: bool,
        organization_id: uuid.UUID,
        workspace_id: uuid.UUID,
        current_admin: User,
    ) -> UserGovernanceResponse:
        stmt = select(User).where(User.id == user_id, User.organization_id == organization_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        if user.id == current_admin.id and not is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Administrators cannot deactivate their own account.")

        if not is_active and user.role == UserRole.ADMIN:
            admin_count_res = await db.execute(
                select(func.count(User.id)).where(
                    User.organization_id == organization_id,
                    User.role == UserRole.ADMIN,
                    User.is_active == True,
                    User.id != user_id,
                )
            )
            other_admins = admin_count_res.scalar() or 0
            if other_admins == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot deactivate the only active Administrator.",
                )

        user.is_active = is_active
        await db.commit()
        await db.refresh(user)

        await log_audit_event(
            db=db,
            action="governance:status_change",
            resource_type="user",
            resource_id=str(user.id),
            user_id=current_admin.id,
            workspace_id=workspace_id,
            details={"user_email": user.email, "is_active": is_active},
        )

        return UserGovernanceResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            role=user.role.value,
            is_active=user.is_active,
            created_at=user.created_at,
        )

    @staticmethod
    async def delete_user(
        db: AsyncSession,
        user_id: uuid.UUID,
        organization_id: uuid.UUID,
        workspace_id: uuid.UUID,
        current_admin: User,
    ) -> dict:
        stmt = select(User).where(User.id == user_id, User.organization_id == organization_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        if user.id == current_admin.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account.")

        if user.role == UserRole.ADMIN:
            admin_count_res = await db.execute(
                select(func.count(User.id)).where(
                    User.organization_id == organization_id,
                    User.role == UserRole.ADMIN,
                    User.is_active == True,
                    User.id != user_id,
                )
            )
            other_admins = admin_count_res.scalar() or 0
            if other_admins == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot delete the only remaining active Administrator.",
                )

        email = user.email
        await db.delete(user)
        await db.commit()

        await log_audit_event(
            db=db,
            action="governance:user_remove",
            resource_type="user",
            resource_id=str(user_id),
            user_id=current_admin.id,
            workspace_id=workspace_id,
            details={"email": email},
        )

        return {"message": f"User {email} has been removed from the organization."}

    @staticmethod
    async def get_overview(db: AsyncSession, organization_id: uuid.UUID, workspace_id: uuid.UUID) -> GovernanceOverviewResponse:
        # Users count by role
        users_res = await db.execute(select(User).where(User.organization_id == organization_id))
        users = users_res.scalars().all()
        by_role: Dict[str, int] = {}
        for u in users:
            r = u.role.value
            by_role[r] = by_role.get(r, 0) + 1

        # Datasets count
        ds_count_res = await db.execute(select(func.count(Dataset.id)).where(Dataset.workspace_id == workspace_id))
        ds_count = ds_count_res.scalar() or 0

        # Dashboards count
        dash_count_res = await db.execute(select(func.count(Dashboard.id)).where(Dashboard.workspace_id == workspace_id))
        dash_count = dash_count_res.scalar() or 0

        pub_dash_res = await db.execute(select(func.count(Dashboard.id)).where(Dashboard.workspace_id == workspace_id, Dashboard.is_published == True))
        pub_count = pub_dash_res.scalar() or 0

        # Audit logs count
        audit_res = await db.execute(select(func.count(AuditLog.id)).where(AuditLog.workspace_id == workspace_id))
        audit_count = audit_res.scalar() or 0

        return GovernanceOverviewResponse(
            total_users=len(users),
            users_by_role=by_role,
            total_datasets=ds_count,
            total_dashboards=dash_count,
            published_dashboards=pub_count,
            total_audit_logs=audit_count,
            security_posture="Enterprise Governed (SOC2 Active)",
        )

    @staticmethod
    def get_role_definitions() -> List[RolePermissionInfo]:
        roles = []
        for role, perms in ROLE_PERMISSIONS.items():
            roles.append(RolePermissionInfo(
                role=role.value,
                permissions=perms,
                description=ROLE_DESCRIPTIONS.get(role, ""),
            ))
        return roles

    @staticmethod
    async def get_audit_logs(
        db: AsyncSession,
        workspace_id: uuid.UUID,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        user_id: Optional[uuid.UUID] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[AuditLogResponse]:
        stmt = (
            select(AuditLog)
            .where(AuditLog.workspace_id == workspace_id)
            .options(selectinload(AuditLog.user))
            .order_by(AuditLog.created_at.desc())
        )

        if action:
            stmt = stmt.where(AuditLog.action == action)
        if resource_type:
            stmt = stmt.where(AuditLog.resource_type == resource_type)
        if user_id:
            stmt = stmt.where(AuditLog.user_id == user_id)

        stmt = stmt.limit(min(limit, 200)).offset(offset)
        result = await db.execute(stmt)
        logs = result.scalars().all()

        return [
            AuditLogResponse(
                id=l.id,
                workspace_id=l.workspace_id,
                user_id=l.user_id,
                user_name=l.user.full_name if l.user else None,
                user_email=l.user.email if l.user else None,
                action=l.action,
                resource_type=l.resource_type,
                resource_id=l.resource_id,
                details=l.details or {},
                ip_address=l.ip_address,
                created_at=l.created_at,
            )
            for l in logs
        ]

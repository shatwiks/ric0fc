import uuid
import secrets
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.auth import User, UserRole
from app.models.dashboard import Dashboard, DashboardWidget, DashboardFilter, DashboardShare
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
from app.services.dataset_service import DatasetService
from app.services.audit_service import log_audit_event

class DashboardService:
    @staticmethod
    def _to_share_response(share: DashboardShare) -> DashboardShareResponse:
        return DashboardShareResponse(
            id=share.id,
            dashboard_id=share.dashboard_id,
            user_id=share.user_id,
            user_name=share.user.full_name if share.user else None,
            user_email=share.user.email if share.user else share.shared_with_email,
            shared_with_email=share.shared_with_email,
            role=share.role,
            permission=share.permission,
            created_at=share.created_at,
        )

    @staticmethod
    def _to_dashboard_response(dashboard: Dashboard) -> DashboardResponse:
        res = DashboardResponse(
            id=dashboard.id,
            workspace_id=dashboard.workspace_id,
            title=dashboard.title,
            description=dashboard.description,
            layout=dashboard.layout or {},
            is_published=dashboard.is_published,
            published_at=dashboard.published_at,
            share_token=dashboard.share_token,
            created_by=dashboard.created_by,
            created_at=dashboard.created_at,
            updated_at=dashboard.updated_at,
            widget_count=len(dashboard.widgets) if dashboard.widgets else 0,
            widgets=[DashboardWidgetResponse.model_validate(w) for w in (dashboard.widgets or [])],
            filters=[DashboardFilterResponse.model_validate(f) for f in (dashboard.filters or [])],
            shares=[DashboardService._to_share_response(s) for s in (dashboard.shares or [])],
        )
        return res

    @staticmethod
    async def create_dashboard(
        db: AsyncSession,
        data: DashboardCreate,
        workspace_id: uuid.UUID,
        user: User,
    ) -> DashboardResponse:
        share_token = f"dash_{secrets.token_urlsafe(24)}"
        dashboard = Dashboard(
            workspace_id=workspace_id,
            title=data.title.strip() or "Untitled Dashboard",
            description=data.description,
            layout=data.layout or {},
            is_published=data.is_published,
            published_at=datetime.now(timezone.utc) if data.is_published else None,
            share_token=share_token,
            created_by=user.id,
        )
        db.add(dashboard)
        await db.flush()

        # Optional initial widgets
        created_widgets = []
        if data.widgets:
            for w in data.widgets:
                widget = DashboardWidget(
                    dashboard_id=dashboard.id,
                    dataset_id=w.dataset_id,
                    title=w.title,
                    chart_type=w.chart_type,
                    dimensions=w.dimensions,
                    measures=w.measures,
                    filters=w.filters,
                    config=w.config,
                    position=w.position,
                )
                db.add(widget)
                created_widgets.append(widget)

        await db.commit()

        # Audit log
        await log_audit_event(
            db=db,
            action="dashboard:create",
            resource_type="dashboard",
            resource_id=str(dashboard.id),
            user_id=user.id,
            workspace_id=workspace_id,
            details={"title": dashboard.title, "widgets_count": len(created_widgets), "is_published": dashboard.is_published},
        )

        return await DashboardService.get_dashboard(db, dashboard.id, workspace_id, user=user)

    @staticmethod
    async def list_dashboards(db: AsyncSession, workspace_id: uuid.UUID, user: Optional[User] = None) -> List[DashboardResponse]:
        stmt = (
            select(Dashboard)
            .where(Dashboard.workspace_id == workspace_id)
            .options(
                selectinload(Dashboard.widgets),
                selectinload(Dashboard.filters),
                selectinload(Dashboard.shares).selectinload(DashboardShare.user),
            )
            .order_by(Dashboard.updated_at.desc())
        )
        result = await db.execute(stmt)
        dashboards = result.scalars().all()

        responses = []
        for d in dashboards:
            # If user is Viewer/Explorer and dashboard is not published, check if shared or owned
            if user and not d.is_published:
                is_admin = user.role == UserRole.ADMIN
                is_creator = d.created_by == user.id
                is_analyst_pub = user.role in [UserRole.ANALYST, UserRole.PUBLISHER]
                has_user_share = any(s.user_id == user.id for s in d.shares)
                has_role_share = any(s.role == user.role.value for s in d.shares)

                if not (is_admin or is_creator or is_analyst_pub or has_user_share or has_role_share):
                    continue  # Skip unshared drafts for restricted viewers
            responses.append(DashboardService._to_dashboard_response(d))
        return responses

    @staticmethod
    async def get_dashboard(
        db: AsyncSession,
        dashboard_id: uuid.UUID,
        workspace_id: uuid.UUID,
        user: Optional[User] = None,
    ) -> DashboardResponse:
        # Cross-org isolation check
        stmt_any = (
            select(Dashboard)
            .where(Dashboard.id == dashboard_id)
            .options(
                selectinload(Dashboard.widgets),
                selectinload(Dashboard.filters),
                selectinload(Dashboard.shares).selectinload(DashboardShare.user),
            )
        )
        result = await db.execute(stmt_any)
        dashboard = result.scalar_one_or_none()

        if not dashboard:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dashboard not found.",
            )
        if dashboard.workspace_id != workspace_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Dashboard belongs to another organization or workspace.",
            )

        # Check draft vs published access for users
        if user and not dashboard.is_published:
            is_admin = user.role == UserRole.ADMIN
            is_creator = dashboard.created_by == user.id
            is_analyst_pub = user.role in [UserRole.ANALYST, UserRole.PUBLISHER]
            has_user_share = any(s.user_id == user.id for s in dashboard.shares)
            has_role_share = any(s.role == user.role.value for s in dashboard.shares)

            if not (is_admin or is_creator or is_analyst_pub or has_user_share or has_role_share):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Dashboard is unpublished (Draft). Access requires administrator role, ownership, or granted share permissions.",
                )

        return DashboardService._to_dashboard_response(dashboard)

    @staticmethod
    async def update_dashboard(
        db: AsyncSession,
        dashboard_id: uuid.UUID,
        data: DashboardUpdate,
        workspace_id: uuid.UUID,
        user: User,
    ) -> DashboardResponse:
        stmt = (
            select(Dashboard)
            .where(Dashboard.id == dashboard_id)
            .options(
                selectinload(Dashboard.widgets),
                selectinload(Dashboard.filters),
                selectinload(Dashboard.shares).selectinload(DashboardShare.user),
            )
        )
        result = await db.execute(stmt)
        dashboard = result.scalar_one_or_none()

        if not dashboard:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found.")
        if dashboard.workspace_id != workspace_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. Dashboard belongs to another organization or workspace.")

        if data.title is not None:
            dashboard.title = data.title.strip() or "Untitled Dashboard"
        if data.description is not None:
            dashboard.description = data.description
        if data.layout is not None:
            dashboard.layout = data.layout
        if data.is_published is not None:
            dashboard.is_published = data.is_published
            if dashboard.is_published and not dashboard.published_at:
                dashboard.published_at = datetime.now(timezone.utc)
            elif not dashboard.is_published:
                dashboard.published_at = None

        await db.commit()

        await log_audit_event(
            db=db,
            action="dashboard:update",
            resource_type="dashboard",
            resource_id=str(dashboard.id),
            user_id=user.id,
            workspace_id=workspace_id,
            details={"title": dashboard.title, "is_published": dashboard.is_published},
        )

        return await DashboardService.get_dashboard(db, dashboard_id, workspace_id, user=user)

    @staticmethod
    async def publish_dashboard(
        db: AsyncSession,
        dashboard_id: uuid.UUID,
        workspace_id: uuid.UUID,
        user: User,
    ) -> DashboardResponse:
        stmt = select(Dashboard).where(Dashboard.id == dashboard_id)
        result = await db.execute(stmt)
        dashboard = result.scalar_one_or_none()

        if not dashboard:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found.")
        if dashboard.workspace_id != workspace_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        dashboard.is_published = True
        dashboard.published_at = datetime.now(timezone.utc)
        if not dashboard.share_token:
            dashboard.share_token = f"dash_{uuid.uuid4().hex[:12]}"

        await db.commit()

        await log_audit_event(
            db=db,
            action="dashboard:publish",
            resource_type="dashboard",
            resource_id=str(dashboard_id),
            user_id=user.id,
            workspace_id=workspace_id,
            details={"title": dashboard.title, "published_at": dashboard.published_at.isoformat()},
        )

        return await DashboardService.get_dashboard(db, dashboard_id, workspace_id, user=user)

    @staticmethod
    async def unpublish_dashboard(
        db: AsyncSession,
        dashboard_id: uuid.UUID,
        workspace_id: uuid.UUID,
        user: User,
    ) -> DashboardResponse:
        stmt = select(Dashboard).where(Dashboard.id == dashboard_id)
        result = await db.execute(stmt)
        dashboard = result.scalar_one_or_none()

        if not dashboard:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found.")
        if dashboard.workspace_id != workspace_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        dashboard.is_published = False
        dashboard.published_at = None
        dashboard.share_token = None

        await db.commit()

        await log_audit_event(
            db=db,
            action="dashboard:unpublish",
            resource_type="dashboard",
            resource_id=str(dashboard_id),
            user_id=user.id,
            workspace_id=workspace_id,
            details={"title": dashboard.title},
        )

        return await DashboardService.get_dashboard(db, dashboard_id, workspace_id, user=user)

    @staticmethod
    async def get_share_link(
        db: AsyncSession,
        dashboard_id: uuid.UUID,
        workspace_id: uuid.UUID,
        user: User,
    ) -> ShareLinkResponse:
        stmt = select(Dashboard).where(Dashboard.id == dashboard_id)
        result = await db.execute(stmt)
        dashboard = result.scalar_one_or_none()

        if not dashboard:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found.")
        if dashboard.workspace_id != workspace_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        if not dashboard.share_token:
            dashboard.share_token = f"dash_{secrets.token_urlsafe(24)}"
            await db.commit()

        return ShareLinkResponse(
            share_token=dashboard.share_token,
            share_url=f"/dashboard/dashboards/{dashboard.id}?shared=true&token={dashboard.share_token}",
            is_published=dashboard.is_published,
        )

    @staticmethod
    async def list_shares(
        db: AsyncSession,
        dashboard_id: uuid.UUID,
        workspace_id: uuid.UUID,
        user: User,
    ) -> List[DashboardShareResponse]:
        # Verify dashboard belongs to workspace
        await DashboardService.get_dashboard(db, dashboard_id, workspace_id, user=user)

        stmt = (
            select(DashboardShare)
            .where(DashboardShare.dashboard_id == dashboard_id)
            .options(selectinload(DashboardShare.user))
            .order_by(DashboardShare.created_at.desc())
        )
        result = await db.execute(stmt)
        shares = result.scalars().all()
        return [DashboardService._to_share_response(s) for s in shares]

    @staticmethod
    async def add_share(
        db: AsyncSession,
        dashboard_id: uuid.UUID,
        data: DashboardShareCreate,
        workspace_id: uuid.UUID,
        user: User,
    ) -> DashboardShareResponse:
        # Verify dashboard exists
        dash = await DashboardService.get_dashboard(db, dashboard_id, workspace_id, user=user)

        target_user = None
        if data.user_id:
            target_user_res = await db.execute(select(User).where(User.id == data.user_id))
            target_user = target_user_res.scalar_one_or_none()
            if not target_user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User to share with not found.")
        elif data.shared_with_email:
            target_user_res = await db.execute(select(User).where(User.email == data.shared_with_email.lower().strip()))
            target_user = target_user_res.scalar_one_or_none()

        share = DashboardShare(
            dashboard_id=dashboard_id,
            user_id=target_user.id if target_user else None,
            shared_with_email=target_user.email if target_user else (data.shared_with_email.lower().strip() if data.shared_with_email else None),
            role=data.role,
            permission=data.permission or "view",
            created_by=user.id,
        )
        db.add(share)
        await db.commit()
        await db.refresh(share)

        if target_user:
            share.user = target_user

        await log_audit_event(
            db=db,
            action="dashboard:share",
            resource_type="dashboard",
            resource_id=str(dashboard_id),
            user_id=user.id,
            workspace_id=workspace_id,
            details={
                "dashboard_title": dash.title,
                "shared_with": share.shared_with_email or share.role,
                "permission": share.permission,
            },
        )

        return DashboardService._to_share_response(share)

    @staticmethod
    async def delete_share(
        db: AsyncSession,
        dashboard_id: uuid.UUID,
        share_id: uuid.UUID,
        workspace_id: uuid.UUID,
        user: User,
    ) -> dict:
        await DashboardService.get_dashboard(db, dashboard_id, workspace_id, user=user)

        stmt = select(DashboardShare).where(
            DashboardShare.id == share_id,
            DashboardShare.dashboard_id == dashboard_id,
        )
        result = await db.execute(stmt)
        share = result.scalar_one_or_none()

        if not share:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share record not found.")

        target = share.shared_with_email or share.role or str(share.user_id)
        await db.delete(share)
        await db.commit()

        await log_audit_event(
            db=db,
            action="dashboard:unshare",
            resource_type="dashboard",
            resource_id=str(dashboard_id),
            user_id=user.id,
            workspace_id=workspace_id,
            details={"removed_access_for": target},
        )

        return {"message": "Access removed successfully."}

    @staticmethod
    async def get_shared_dashboard(db: AsyncSession, share_token: str) -> DashboardResponse:
        stmt = (
            select(Dashboard)
            .where(Dashboard.share_token == share_token)
            .options(
                selectinload(Dashboard.widgets),
                selectinload(Dashboard.filters),
                selectinload(Dashboard.shares).selectinload(DashboardShare.user),
            )
        )
        result = await db.execute(stmt)
        dashboard = result.scalar_one_or_none()

        if not dashboard or not dashboard.is_published:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shared dashboard not found or is unpublished.",
            )

        return DashboardService._to_dashboard_response(dashboard)

    @staticmethod
    async def delete_dashboard(
        db: AsyncSession,
        dashboard_id: uuid.UUID,
        workspace_id: uuid.UUID,
        user: User,
    ) -> dict:
        stmt = select(Dashboard).where(Dashboard.id == dashboard_id)
        result = await db.execute(stmt)
        dashboard = result.scalar_one_or_none()

        if not dashboard:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found.")
        if dashboard.workspace_id != workspace_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. Dashboard belongs to another organization or workspace.")

        title = dashboard.title
        await db.delete(dashboard)
        await db.commit()

        await log_audit_event(
            db=db,
            action="dashboard:delete",
            resource_type="dashboard",
            resource_id=str(dashboard_id),
            user_id=user.id,
            workspace_id=workspace_id,
            details={"title": title},
        )

        return {"message": f"Dashboard '{title}' deleted successfully."}

    # Widget Management
    @staticmethod
    async def add_widget(
        db: AsyncSession,
        dashboard_id: uuid.UUID,
        widget_data: DashboardWidgetCreate,
        workspace_id: uuid.UUID,
        user: User,
    ) -> DashboardWidgetResponse:
        await DashboardService.get_dashboard(db, dashboard_id, workspace_id, user=user)

        if widget_data.dataset_id:
            await DatasetService.get_dataset(db, widget_data.dataset_id, workspace_id)

        widget = DashboardWidget(
            dashboard_id=dashboard_id,
            dataset_id=widget_data.dataset_id,
            title=widget_data.title,
            chart_type=widget_data.chart_type,
            dimensions=widget_data.dimensions,
            measures=widget_data.measures,
            filters=widget_data.filters,
            config=widget_data.config,
            position=widget_data.position,
        )
        db.add(widget)
        await db.commit()
        await db.refresh(widget)

        await log_audit_event(
            db=db,
            action="widget:create",
            resource_type="dashboard_widget",
            resource_id=str(widget.id),
            user_id=user.id,
            workspace_id=workspace_id,
            details={"dashboard_id": str(dashboard_id), "chart_type": widget.chart_type, "title": widget.title},
        )

        return DashboardWidgetResponse.model_validate(widget)

    @staticmethod
    async def update_widget(
        db: AsyncSession,
        dashboard_id: uuid.UUID,
        widget_id: uuid.UUID,
        widget_data: DashboardWidgetUpdate,
        workspace_id: uuid.UUID,
        user: User,
    ) -> DashboardWidgetResponse:
        await DashboardService.get_dashboard(db, dashboard_id, workspace_id, user=user)

        stmt = select(DashboardWidget).where(
            DashboardWidget.id == widget_id,
            DashboardWidget.dashboard_id == dashboard_id,
        )
        result = await db.execute(stmt)
        widget = result.scalar_one_or_none()

        if not widget:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Widget not found on this dashboard.")

        if widget_data.title is not None:
            widget.title = widget_data.title
        if widget_data.chart_type is not None:
            widget.chart_type = widget_data.chart_type
        if widget_data.dataset_id is not None:
            if widget_data.dataset_id:
                await DatasetService.get_dataset(db, widget_data.dataset_id, workspace_id)
            widget.dataset_id = widget_data.dataset_id
        if widget_data.dimensions is not None:
            widget.dimensions = widget_data.dimensions
        if widget_data.measures is not None:
            widget.measures = widget_data.measures
        if widget_data.filters is not None:
            widget.filters = widget_data.filters
        if widget_data.config is not None:
            widget.config = widget_data.config
        if widget_data.position is not None:
            widget.position = widget_data.position

        await db.commit()
        await db.refresh(widget)

        await log_audit_event(
            db=db,
            action="widget:update",
            resource_type="dashboard_widget",
            resource_id=str(widget.id),
            user_id=user.id,
            workspace_id=workspace_id,
            details={"title": widget.title},
        )

        return DashboardWidgetResponse.model_validate(widget)

    @staticmethod
    async def delete_widget(
        db: AsyncSession,
        dashboard_id: uuid.UUID,
        widget_id: uuid.UUID,
        workspace_id: uuid.UUID,
        user: User,
    ) -> dict:
        await DashboardService.get_dashboard(db, dashboard_id, workspace_id, user=user)

        stmt = select(DashboardWidget).where(
            DashboardWidget.id == widget_id,
            DashboardWidget.dashboard_id == dashboard_id,
        )
        result = await db.execute(stmt)
        widget = result.scalar_one_or_none()

        if not widget:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Widget not found on this dashboard.")

        title = widget.title
        await db.delete(widget)
        await db.commit()

        await log_audit_event(
            db=db,
            action="widget:delete",
            resource_type="dashboard_widget",
            resource_id=str(widget_id),
            user_id=user.id,
            workspace_id=workspace_id,
            details={"title": title, "dashboard_id": str(dashboard_id)},
        )

        return {"message": f"Widget '{title}' removed."}

    # Filters Management
    @staticmethod
    async def add_filter(
        db: AsyncSession,
        dashboard_id: uuid.UUID,
        filter_data: DashboardFilterCreate,
        workspace_id: uuid.UUID,
        user: User,
    ) -> DashboardFilterResponse:
        await DashboardService.get_dashboard(db, dashboard_id, workspace_id, user=user)

        f = DashboardFilter(
            dashboard_id=dashboard_id,
            column_name=filter_data.column_name,
            filter_type=filter_data.filter_type,
            default_value=filter_data.default_value,
        )
        db.add(f)
        await db.commit()
        await db.refresh(f)

        return DashboardFilterResponse.model_validate(f)

    @staticmethod
    async def delete_filter(
        db: AsyncSession,
        dashboard_id: uuid.UUID,
        filter_id: uuid.UUID,
        workspace_id: uuid.UUID,
        user: User,
    ) -> dict:
        await DashboardService.get_dashboard(db, dashboard_id, workspace_id, user=user)

        stmt = select(DashboardFilter).where(
            DashboardFilter.id == filter_id,
            DashboardFilter.dashboard_id == dashboard_id,
        )
        result = await db.execute(stmt)
        f = result.scalar_one_or_none()

        if not f:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Filter not found.")

        await db.delete(f)
        await db.commit()

        return {"message": "Filter removed."}

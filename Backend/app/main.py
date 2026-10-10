from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select, text

from app.config import settings
from app.database import engine, Base, AsyncSessionLocal
import app.models
from app.models.auth import Organization, Workspace, User, UserRole, OrganizationMember
from app.utils.security import hash_password
from app.routers import (
    auth_router,
    health_router,
    datasets_router,
    query_router,
    dashboards_router,
    governance_router,
    reports_router,
    ai_router,
    detective_router,
    pulse_router,
)

async def seed_initial_demo_users():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Organization).where(Organization.slug == "ricoz-enterprise"))
        org = result.scalar_one_or_none()

        if not org:
            org = Organization(
                name="Ricoz Enterprise Analytics",
                slug="ricoz-enterprise",
                plan="enterprise",
                company_size="1000+",
                industry="Analytics & Enterprise Software",
            )
            session.add(org)
            await session.flush()

            workspace = Workspace(
                organization_id=org.id,
                name="Production Intelligence Workspace",
                slug="production",
            )
            session.add(workspace)
            await session.flush()

        demo_users = [
            ("admin@ricozviz.com", "admin123", "Sarah Connor", UserRole.ADMIN),
            ("publisher@ricozviz.com", "publisher123", "David Kim", UserRole.PUBLISHER),
            ("analyst@ricozviz.com", "analyst123", "Alex Mercer", UserRole.ANALYST),
            ("explorer@ricozviz.com", "explorer123", "Maya Lin", UserRole.EXPLORER),
            ("viewer@ricozviz.com", "viewer123", "Elena Rostova", UserRole.VIEWER),
        ]

        for email, password, name, role in demo_users:
            user_check = await session.execute(select(User).where(User.email == email))
            existing_user = user_check.scalar_one_or_none()
            if not existing_user:
                existing_user = User(
                    organization_id=org.id,
                    email=email,
                    password_hash=hash_password(password),
                    full_name=name,
                    role=role,
                    is_active=True,
                )
                session.add(existing_user)
                await session.flush()
            elif existing_user.role != role:
                existing_user.role = role

            # Ensure membership exists
            mem_check = await session.execute(
                select(OrganizationMember).where(
                    OrganizationMember.user_id == existing_user.id,
                    OrganizationMember.organization_id == org.id,
                )
            )
            if not mem_check.scalar_one_or_none():
                session.add(
                    OrganizationMember(
                        organization_id=org.id,
                        user_id=existing_user.id,
                        role=role,
                        is_active=True,
                    )
                )

        await session.commit()
        print("[RicozViz] Seeded enterprise demo accounts (Admin, Publisher, Analyst, Explorer, Viewer).")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables in PostgreSQL
    print("[RicozViz] Initializing PostgreSQL database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS company_size VARCHAR(50);"))
        await conn.execute(text("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS industry VARCHAR(100);"))
        await conn.execute(text("ALTER TABLE datasets ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ready';"))
        await conn.execute(text("ALTER TABLE datasets ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);"))
        await conn.execute(text("ALTER TABLE datasets ADD COLUMN IF NOT EXISTS file_size_bytes INTEGER DEFAULT 0;"))
        await conn.execute(text("ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS share_token VARCHAR(100);"))
        await conn.execute(text("ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;"))
        await conn.execute(text("ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;"))
        await conn.execute(text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS workspace_id UUID;"))
        await conn.execute(text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS dataset_id UUID;"))
        await conn.execute(text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS file_path VARCHAR(500);"))
        await conn.execute(text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS file_size_bytes INTEGER DEFAULT 0;"))
        await conn.execute(text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS filters JSONB DEFAULT '{}'::jsonb;"))
        try:
            await conn.execute(text("ALTER TABLE reports ALTER COLUMN dashboard_id DROP NOT NULL;"))
        except Exception:
            pass
        await conn.execute(text("ALTER TABLE report_schedules ADD COLUMN IF NOT EXISTS workspace_id UUID;"))
        await conn.execute(text("ALTER TABLE report_schedules ADD COLUMN IF NOT EXISTS dashboard_id UUID;"))
        await conn.execute(text("ALTER TABLE report_schedules ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT 'Scheduled Report';"))
        await conn.execute(text("ALTER TABLE report_schedules ADD COLUMN IF NOT EXISTS format VARCHAR(20) DEFAULT 'pdf';"))
        await conn.execute(text("ALTER TABLE report_schedules ADD COLUMN IF NOT EXISTS recipients JSONB DEFAULT '[]'::jsonb;"))
        await conn.execute(text("ALTER TABLE report_schedules ADD COLUMN IF NOT EXISTS created_by UUID;"))
        await conn.execute(text("ALTER TABLE report_schedules ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();"))
        try:
            await conn.execute(text("ALTER TABLE report_schedules ALTER COLUMN report_id DROP NOT NULL;"))
        except Exception:
            pass
    print("[RicozViz] Database tables verified.")
    
    # Seed initial demo organization & roles if empty
    await seed_initial_demo_users()
    
    yield
    
    # Shutdown: Dispose engine connection pool
    print("[RicozViz] Closing database connections...")
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise Analytics & Data Intelligence Platform API",
    lifespan=lifespan,
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
)

# Exception handling
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[ERROR] Unhandled exception on {request.method} {request.url}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please contact system support."},
    )

# Routers
app.include_router(health_router, prefix=settings.API_PREFIX)
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(datasets_router, prefix=settings.API_PREFIX)
app.include_router(query_router, prefix=settings.API_PREFIX)
app.include_router(dashboards_router, prefix=settings.API_PREFIX)
app.include_router(governance_router, prefix=settings.API_PREFIX)
app.include_router(reports_router, prefix=settings.API_PREFIX)
app.include_router(ai_router, prefix=settings.API_PREFIX)
app.include_router(detective_router, prefix=settings.API_PREFIX)
app.include_router(pulse_router, prefix=settings.API_PREFIX)

@app.get("/")
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs",
    }

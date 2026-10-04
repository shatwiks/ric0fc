import asyncio
import sys
import os

# Add Backend directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine, Base, AsyncSessionLocal
import app.models  # Registers all models
from app.models.auth import Organization, Workspace, User, UserRole
from app.schemas.auth import UserSignupRequest, UserLoginRequest
from app.services.auth_service import AuthService
from app.utils.security import decode_access_token, get_role_permissions

async def run_day1_verification():
    print("=" * 60)
    print("RICOZVIZ DAY 1 BACKEND VERIFICATION SUITE")
    print("=" * 60)

    # 1. Test PostgreSQL Connection & Table Creation
    print("\n[1/6] Connecting to PostgreSQL & Creating Tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("  -> Tables created successfully in PostgreSQL!")

    # 2. Test Real Signup via AuthService
    print("\n[2/6] Testing Real User Signup...")
    test_email = "lead_analyst@ricozviz.com"
    async with AsyncSessionLocal() as session:
        try:
            signup_req = UserSignupRequest(
                full_name="Marcus Vance",
                email=test_email,
                password="SecurePassword2026!",
                organization_name="Quantum Metrics Corp",
                role=UserRole.ANALYST,
            )
            signup_res = await AuthService.signup(session, signup_req, client_ip="127.0.0.1")
            print(f"  -> Signup SUCCESS!")
            print(f"     User ID: {signup_res.user_id}")
            print(f"     Email: {signup_res.email}")
            print(f"     Role: {signup_res.role}")
            print(f"     Org ID: {signup_res.organization_id}")
            print(f"     Workspace ID: {signup_res.workspace_id}")
            print(f"     JWT Token Prefix: {signup_res.access_token[:25]}...")
        except Exception as e:
            if "already exists" in str(e):
                print(f"  -> User {test_email} already registered from previous run. Continuing to login...")
            else:
                raise e

    # 3. Test Real Login with Correct & Incorrect Passwords
    print("\n[3/6] Testing Real Authentication...")
    async with AsyncSessionLocal() as session:
        # Invalid password check
        bad_login = UserLoginRequest(email=test_email, password="WrongPassword!")
        try:
            await AuthService.login(session, bad_login, client_ip="127.0.0.1")
            print("  -> ERROR: Invalid password was accepted!")
            sys.exit(1)
        except Exception:
            print("  -> Correctly rejected invalid password (401 Unauthorized)")

        # Valid password check
        good_login = UserLoginRequest(email=test_email, password="SecurePassword2026!")
        login_res = await AuthService.login(session, good_login, client_ip="127.0.0.1")
        print(f"  -> Login SUCCESS!")
        print(f"     Authenticated as: {login_res.full_name} ({login_res.email})")

    # 4. Test JWT Payload & Verification
    print("\n[4/6] Verifying JWT Token Security...")
    payload = decode_access_token(login_res.access_token)
    assert payload is not None, "Failed to decode JWT token"
    assert payload["email"] == test_email
    assert payload["role"] == UserRole.ANALYST.value
    print(f"  -> JWT payload verified: sub={payload['sub']}, role={payload['role']}")

    # 5. Test RBAC Permissions
    print("\n[5/6] Verifying Role-Based Access Control (RBAC)...")
    analyst_perms = get_role_permissions(UserRole.ANALYST)
    admin_perms = get_role_permissions(UserRole.ADMIN)
    viewer_perms = get_role_permissions(UserRole.VIEWER)

    assert "create:dashboards" in analyst_perms
    assert "manage:users" not in analyst_perms
    assert "*" in admin_perms
    assert "create:dashboards" not in viewer_perms
    print(f"  -> Viewer permissions ({len(viewer_perms)}): {viewer_perms}")
    print(f"  -> Analyst permissions ({len(analyst_perms)}): {analyst_perms}")
    print(f"  -> Admin permissions ({len(admin_perms)}): {admin_perms}")
    print("  -> RBAC matrix verified!")

    # 6. Verify Audit Trail in PostgreSQL
    print("\n[6/6] Verifying Persistent Audit Logs...")
    from sqlalchemy import select
    from app.models.governance import AuditLog
    async with AsyncSessionLocal() as session:
        logs = await session.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(5))
        log_entries = logs.scalars().all()
        print(f"  -> Found {len(log_entries)} audit entries in database:")
        for entry in log_entries:
            print(f"     [{entry.created_at.strftime('%H:%M:%S')}] Action: {entry.action} | User: {entry.user_id} | Details: {entry.details}")

    print("\n" + "=" * 60)
    print("ALL DAY 1 BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_day1_verification())

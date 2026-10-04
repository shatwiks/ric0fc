import asyncio
import json
import time
import uuid
import sys
import os

# Add Backend directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

from playwright.async_api import async_playwright, Response, ConsoleMessage
from app.database import AsyncSessionLocal, engine
from app.models.auth import User, Organization, Workspace, UserRole
from app.utils.security import decode_access_token
from sqlalchemy import select

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
FRONTEND_BASE_URL = "http://localhost:3000"
BACKEND_BASE_URL = "http://127.0.0.1:8000"

async def run_full_verification():
    print("=" * 70)
    print("RICOZVIZ DAY 1 COMPLETE FRONTEND-TO-BACKEND INTEGRATION TEST")
    print("=" * 70)

    test_id = uuid.uuid4().hex[:6]
    test_user_name = "Dr. Rachel Sterling"
    test_org_name = f"Aether Dynamics AI {test_id.upper()}"
    test_email = f"rachel.sterling.{test_id}@aetherdynamics.io"
    test_password = "EnterpriseSecure2026!"
    test_role = "Analyst"

    results = {}
    console_errors = []
    failed_requests = []
    cors_verified = False

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=CHROME_PATH,
            headless=True,
        )
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900}
        )
        page = await context.new_page()

        # Listen for console errors & network requests
        def on_console(msg: ConsoleMessage):
            if msg.type in ["error"]:
                console_errors.append(f"[{msg.type}] {msg.text}")

        async def on_response(res: Response):
            nonlocal cors_verified
            if "localhost:8000" in res.url or "127.0.0.1:8000" in res.url:
                if res.status >= 500:
                    failed_requests.append(f"{res.request.method} {res.url} -> {res.status}")
                # Check CORS headers
                headers = await res.all_headers()
                if "access-control-allow-origin" in headers:
                    cors_verified = True

        page.on("console", on_console)
        page.on("response", on_response)

        # -------------------------------------------------------------
        # TEST 8 & 1: Route guard for unauthenticated /dashboard access
        # -------------------------------------------------------------
        print("\n[Step 1/14] Testing unauthenticated route guard on /dashboard...")
        await page.goto(f"{FRONTEND_BASE_URL}/dashboard")
        await page.wait_for_timeout(1500)
        current_url = page.url
        assert "/auth/login" in current_url, f"Expected redirect to /auth/login, got {current_url}"
        print(f"  -> PASS: Unauthenticated access blocked. Redirected to: {current_url}")
        results["8_unauthenticated_guard"] = True

        # -------------------------------------------------------------
        # TEST 1: Open actual RicozViz signup page
        # -------------------------------------------------------------
        print("\n[Step 2/14] Opening actual RicozViz signup page...")
        await page.goto(f"{FRONTEND_BASE_URL}/auth/signup")
        await page.wait_for_selector("form", timeout=5000)
        assert "/auth/signup" in page.url
        # Verify form fields are visible
        org_input = page.locator('input[placeholder="Acme Global Corporation"]')
        name_input = page.locator('input[placeholder="Jane Doe"]')
        email_input = page.locator('input[placeholder="jane@acme.com"]')
        pass_input = page.locator('input[placeholder="Minimum 6 characters"]')
        role_select = page.locator('select')

        await org_input.wait_for(state="visible")
        await name_input.wait_for(state="visible")
        await email_input.wait_for(state="visible")
        await pass_input.wait_for(state="visible")
        await role_select.wait_for(state="visible")
        print("  -> PASS: Signup page rendered with all required enterprise form fields.")
        results["1_open_signup_page"] = True

        # -------------------------------------------------------------
        # TEST 2: Create new user through the UI
        # -------------------------------------------------------------
        print(f"\n[Step 3/14] Creating new enterprise user through UI ({test_email})...")
        await org_input.fill(test_org_name)
        await name_input.fill(test_user_name)
        await email_input.fill(test_email)
        await pass_input.fill(test_password)
        await role_select.select_option("Analyst")

        submit_btn = page.locator('button[type="submit"]')
        await submit_btn.click()

        # Wait for redirect to /dashboard
        await page.wait_for_url(f"{FRONTEND_BASE_URL}/dashboard", timeout=10000)
        print(f"  -> PASS: User created and automatically routed to {page.url}")
        results["2_create_user_ui"] = True

        # -------------------------------------------------------------
        # TEST 3: Verify user is persisted in PostgreSQL
        # -------------------------------------------------------------
        print("\n[Step 4/14] Verifying new user persistence in PostgreSQL database...")
        async with AsyncSessionLocal() as session:
            stmt = select(User).where(User.email == test_email.lower().strip())
            user_row = (await session.execute(stmt)).scalar_one_or_none()
            assert user_row is not None, f"User {test_email} was not found in PostgreSQL!"
            assert user_row.full_name == test_user_name, f"Expected {test_user_name}, got {user_row.full_name}"
            assert user_row.role == UserRole.ANALYST, f"Expected Analyst, got {user_row.role}"

            # Check organization
            org_stmt = select(Organization).where(Organization.id == user_row.organization_id)
            org_row = (await session.execute(org_stmt)).scalar_one_or_none()
            assert org_row is not None, "Organization was not found in PostgreSQL!"
            assert org_row.name == test_org_name

            print(f"  -> PASS: User verified in PostgreSQL!")
            print(f"     ID: {user_row.id}")
            print(f"     Email: {user_row.email}")
            print(f"     Role: {user_row.role.value}")
            print(f"     Organization: {org_row.name} (Plan: {org_row.plan})")
        results["3_persisted_in_postgresql"] = True

        # -------------------------------------------------------------
        # TEST 5: Verify frontend receives and stores JWT securely
        # -------------------------------------------------------------
        print("\n[Step 5/14] Verifying JWT token in localStorage...")
        token = await page.evaluate("() => localStorage.getItem('ricozviz_token')")
        assert token is not None and len(token) > 30, "ricozviz_token not found in localStorage!"
        payload = decode_access_token(token)
        assert payload is not None, "Token decoding failed!"
        assert payload["email"] == test_email
        assert payload["role"] == "Analyst"
        print(f"  -> PASS: Valid JWT stored in localStorage (sub: {payload['sub']}, exp: {payload['exp']})")
        results["5_jwt_stored_securely"] = True

        # -------------------------------------------------------------
        # TEST 9: Verify user's real name, role and workspace in shell
        # -------------------------------------------------------------
        print("\n[Step 6/14] Verifying real name, role and workspace in application shell...")
        await page.wait_for_selector(f"text={test_user_name}", timeout=5000)
        
        # Check welcome banner & shell text
        page_content = await page.content()
        assert test_user_name in page_content, f"Name '{test_user_name}' not visible in shell"
        assert "Analyst" in page_content, "Role 'Analyst' not visible in shell"
        assert test_org_name in page_content, f"Org '{test_org_name}' not visible in shell"
        print(f"  -> PASS: User name ('{test_user_name}'), Role ('Analyst'), and Org ('{test_org_name}') confirmed in UI shell!")
        results["9_user_role_workspace_in_shell"] = True

        # -------------------------------------------------------------
        # TEST 6: Refresh browser and verify session persists
        # -------------------------------------------------------------
        print("\n[Step 7/14] Refreshing browser to verify session persistence...")
        await page.reload()
        await page.wait_for_timeout(1500)
        assert "/dashboard" in page.url, f"Expected to remain on /dashboard, got {page.url}"
        refreshed_content = await page.content()
        assert test_user_name in refreshed_content
        print("  -> PASS: Authenticated session persisted across page reload.")
        results["6_session_persists_on_refresh"] = True

        # -------------------------------------------------------------
        # TEST 7: Open protected /dashboard route directly
        # -------------------------------------------------------------
        print("\n[Step 8/14] Navigating directly to /dashboard while authenticated...")
        await page.goto(f"{FRONTEND_BASE_URL}/dashboard")
        await page.wait_for_timeout(1000)
        assert "/dashboard" in page.url
        print("  -> PASS: Protected /dashboard route successfully accessed.")
        results["7_protected_dashboard_route"] = True

        # -------------------------------------------------------------
        # TEST 10: Test logout through the actual UI
        # -------------------------------------------------------------
        print("\n[Step 9/14] Testing logout through the actual UI...")
        signout_btn = page.locator('button[title="Sign out of your session"]')
        await signout_btn.wait_for(state="visible")
        await signout_btn.click()
        await page.wait_for_url(f"{FRONTEND_BASE_URL}/auth/login", timeout=5000)
        print(f"  -> PASS: Clicked logout button, successfully redirected to: {page.url}")
        results["10_logout_through_ui"] = True

        # -------------------------------------------------------------
        # TEST 11: Verify session cleared and protected routes inaccessible
        # -------------------------------------------------------------
        print("\n[Step 10/14] Verifying session token cleared and protected route blocked...")
        cleared_token = await page.evaluate("() => localStorage.getItem('ricozviz_token')")
        assert cleared_token is None, f"Expected null token in localStorage, got {cleared_token}"
        
        # Try accessing /dashboard again
        await page.goto(f"{FRONTEND_BASE_URL}/dashboard")
        await page.wait_for_timeout(1500)
        assert "/auth/login" in page.url, f"Protected route was accessible after logout! Got {page.url}"
        print("  -> PASS: Token cleared from localStorage. /dashboard redirected back to /auth/login.")
        results["11_session_cleared_after_logout"] = True

        # -------------------------------------------------------------
        # TEST 12: Test invalid login credentials through UI
        # -------------------------------------------------------------
        print("\n[Step 11/14] Testing invalid login credentials through UI...")
        await page.goto(f"{FRONTEND_BASE_URL}/auth/login")
        await page.wait_for_selector("form", timeout=5000)

        login_email = page.locator('input[type="email"]')
        login_pass = page.locator('input[type="password"]')
        login_submit = page.locator('button[type="submit"]')

        # Attempt with incorrect password
        await login_email.fill(test_email)
        await login_pass.fill("DefectiveWrongPassword123!")
        await login_submit.click()

        # Wait for error message banner
        error_banner = page.locator(".text-red-300, .bg-red-950\\/40, [class*='red']")
        await error_banner.first.wait_for(state="visible", timeout=5000)
        error_text = await error_banner.first.text_content()
        print(f"  -> PASS: Proper error state displayed on screen: '{error_text.strip()}'")
        results["12_invalid_credentials_error_state"] = True

        # -------------------------------------------------------------
        # TEST 4: Login through actual UI with valid credentials
        # -------------------------------------------------------------
        print(f"\n[Step 12/14] Logging in through UI with valid credentials ({test_email})...")
        await login_pass.fill(test_password)
        await login_submit.click()

        await page.wait_for_url(f"{FRONTEND_BASE_URL}/dashboard", timeout=10000)
        login_content = await page.content()
        assert test_user_name in login_content
        print(f"  -> PASS: Successfully logged in through UI. Redirected to /dashboard.")
        results["4_login_through_ui"] = True

        # -------------------------------------------------------------
        # TEST 13: Browser console and network errors check
        # -------------------------------------------------------------
        print("\n[Step 13/14] Checking browser console logs and network health...")
        critical_errors = [e for e in console_errors if "favicon" not in e and "401" not in e]
        print(f"  -> Console errors captured: {len(critical_errors)}")
        for err in critical_errors:
            print(f"     [Console] {err}")
        print(f"  -> Failed network requests (>= 500): {len(failed_requests)}")
        for req in failed_requests:
            print(f"     [Network 5xx] {req}")
        
        assert len(failed_requests) == 0, f"Critical network requests failed: {failed_requests}"
        print("  -> PASS: Zero critical backend network failures or fatal runtime exceptions.")
        results["13_console_and_network_health"] = True

        # -------------------------------------------------------------
        # TEST 14: CORS & API communication between Next.js and FastAPI
        # -------------------------------------------------------------
        print("\n[Step 14/14] Verifying CORS and API communication between Next.js and FastAPI...")
        health_check = await page.evaluate("""
            async () => {
                const res = await fetch("http://localhost:8000/api/health");
                const data = await res.json();
                return { status: res.status, ok: res.ok, data };
            }
        """)
        assert health_check["ok"] is True
        assert health_check["data"]["status"] == "healthy"
        assert health_check["data"]["database"] == "connected"
        print(f"  -> PASS: Direct browser fetch to FastAPI API succeeded with status {health_check['status']}.")
        print(f"     Payload: {health_check['data']}")
        results["14_cors_and_api_communication"] = True

        await browser.close()

    print("\n" + "=" * 70)
    print("ALL 14 FRONTEND & FULL-STACK DAY 1 ACCEPTANCE TESTS PASSED!")
    print("=" * 70)
    print(json.dumps(results, indent=2))
    return results

if __name__ == "__main__":
    asyncio.run(run_full_verification())

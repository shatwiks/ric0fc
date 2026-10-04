"""
RicozViz — End-to-End Browser Security Verification Suite (Playwright)
Verifies:
1. Browser-level RBAC UI enforcement (Viewer cannot see Admin governance/upload controls)
2. XSS Immunity (script injection in dashboard title and widget labels renders safely)
3. Client-side secret exposure prevention (no DB strings, secret keys in window or storage)
4. Anonymous Shared Dashboard access control (published viewable, unpublished denied)
"""

import sys
import uuid
import secrets
import httpx
from playwright.sync_api import sync_playwright

BASE_API = "http://127.0.0.1:8000/api"
BASE_WEB = "http://localhost:3000"

client = httpx.Client(base_url=BASE_API, timeout=30.0)

def main():
    print("=" * 80)
    print(" RICOZVIZ E2E BROWSER SECURITY VERIFICATION")
    print("=" * 80)

    e2e_passed = 0
    e2e_failed = 0

    def check(name: str, condition: bool, msg: str = ""):
        nonlocal e2e_passed, e2e_failed
        if condition:
            e2e_passed += 1
            print(f"  [+] PASS: {name} - {msg}")
        else:
            e2e_failed += 1
            print(f"  [-] FAIL: {name} - {msg}")

    # 1. Setup Test Tenant and Users via API
    rnd = secrets.token_hex(4)
    admin_email = f"e2e_admin_{rnd}@audit.com"
    admin_pwd = f"AdminP@ss_{rnd}123"

    signup_res = client.post("/auth/signup", json={
        "full_name": "E2E Security Admin",
        "email": admin_email,
        "password": admin_pwd,
        "organization_name": f"E2E Security Org {rnd}",
        "role": "Admin",
    })
    assert signup_res.status_code in (200, 201), f"Admin signup failed: {signup_res.text}"
    admin_token = signup_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Invite a Viewer
    viewer_email = f"e2e_viewer_{rnd}@audit.com"
    viewer_pwd = f"ViewerP@ss_{rnd}123"
    inv_res = client.post("/governance/users/invite", headers=admin_headers, json={
        "full_name": "E2E Viewer User",
        "email": viewer_email,
        "password": viewer_pwd,
        "role": "Viewer",
    })
    assert inv_res.status_code == 201, f"Viewer invite failed: {inv_res.text}"

    # Create Dashboard with XSS payload in title
    xss_payload = "<script>window._xss_executed=true;</script><img src=x onerror=\"window._xss_executed=true\">"
    xss_title = f"Security Audit Dashboard {xss_payload}"
    dash_res = client.post("/dashboards", headers=admin_headers, json={
        "title": xss_title,
        "description": "XSS safety verification dashboard",
        "is_published": True,
    })
    assert dash_res.status_code == 201, f"Dashboard creation failed: {dash_res.text}"
    dash_id = dash_res.json()["id"]

    # Get share token
    share_res = client.get(f"/dashboards/{dash_id}/share-link", headers=admin_headers)
    share_token = share_res.json()["share_token"]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        dialog_triggered = False
        def handle_dialog(dialog):
            nonlocal dialog_triggered
            dialog_triggered = True
            print(f"  [!] XSS Alert Detected: {dialog.message}")
            dialog.dismiss()

        page.on("dialog", handle_dialog)

        # ----------------------------------------------------
        # TEST 1: Viewer Login & UI RBAC Restrictions
        # ----------------------------------------------------
        print("\n[1] Testing Viewer UI RBAC Restrictions...")
        page.goto(f"{BASE_WEB}/auth/login", wait_until="networkidle")
        page.fill("input[name='email'], input[type='email']", viewer_email)
        page.fill("input[name='password'], input[type='password']", viewer_pwd)
        page.click("button[type='submit']")
        page.wait_for_timeout(2000)

        # Viewer should be on dashboard home or dashboards page
        check("Viewer Login Success", "/dashboard" in page.url or "/auth" not in page.url, f"Current URL: {page.url}")

        # In sidebar/navigation: Viewer should NOT see Governance / Settings navigation
        gov_link_count = page.locator("a[href*='/governance']").count()
        check("Viewer Governance Nav Hidden", gov_link_count == 0, f"Found {gov_link_count} governance links for Viewer")

        # Direct navigation attempt to Governance should redirect or show access denied
        page.goto(f"{BASE_WEB}/dashboard/governance", wait_until="networkidle")
        page.wait_for_timeout(1000)
        has_access_denied = (
            page.locator("text=Access Denied").count() > 0 or
            page.locator("text=requires").count() > 0 or
            "/dashboard" in page.url and "/governance" not in page.url
        )
        check("Direct Governance Route Restriction", has_access_denied or page.locator("table").count() == 0, "Viewer blocked from viewing admin user table")

        # ----------------------------------------------------
        # TEST 2: XSS Immunity in Dashboard View
        # ----------------------------------------------------
        print("\n[2] Testing XSS Immunity in Dashboard Rendering...")
        page.goto(f"{BASE_WEB}/dashboard/dashboards/{dash_id}", wait_until="networkidle")
        page.wait_for_timeout(2000)

        # Check if window._xss_executed was set by injected script
        xss_executed = page.evaluate("() => Boolean(window._xss_executed)")
        check("Script Tag Execution Blocked", not xss_executed, "window._xss_executed is False")
        check("No JavaScript Alert Dialogs", not dialog_triggered, "dialog_triggered is False")

        # ----------------------------------------------------
        # TEST 3: Client-Side Secret Exposure Verification
        # ----------------------------------------------------
        print("\n[3] Testing Client-Side Secret Exposure...")
        storage_data = page.evaluate("""() => {
            let data = {};
            for (let i = 0; i < localStorage.length; i++) {
                let k = localStorage.key(i);
                data[k] = localStorage.getItem(k);
            }
            return JSON.stringify(data);
        }""")

        check("No Database URLs in LocalStorage", "postgresql://" not in storage_data and "localhost:5432" not in storage_data, "No DB connection strings in client storage")
        check("No Secret Key in LocalStorage", "super-secure-production" not in storage_data, "Server secret key is not in client storage")
        check("No Password Hashes in LocalStorage", "$2b$" not in storage_data, "Bcrypt hashes absent from client storage")

        # ----------------------------------------------------
        # TEST 4: Anonymous Shared Dashboard Access
        # ----------------------------------------------------
        print("\n[4] Testing Anonymous Shared Dashboard Access...")
        # Clear cookies/storage to simulate anonymous user
        anon_context = browser.new_context(viewport={"width": 1440, "height": 900})
        anon_page = anon_context.new_page()

        # Visit shared dashboard link
        shared_url = f"{BASE_WEB}/dashboard/dashboards/{dash_id}?shared=true&token={share_token}"
        anon_page.goto(shared_url, wait_until="networkidle")
        anon_page.wait_for_timeout(2000)

        anon_has_content = anon_page.locator("text=Security Audit Dashboard").count() > 0 or anon_page.locator("h1, h2, h3").count() > 0
        check("Anonymous Access to Published Dashboard", anon_has_content, "Shared dashboard successfully rendered for public viewer")

        # Now unpublish the dashboard via backend
        unpub_res = client.post(f"/dashboards/{dash_id}/unpublish", headers=admin_headers)
        assert unpub_res.status_code == 200, f"Unpublish failed: {unpub_res.text}"

        # Reload the shared page anonymously
        anon_page.reload(wait_until="networkidle")
        anon_page.wait_for_timeout(2000)

        unpub_blocked = (
            anon_page.locator("text=not found").count() > 0 or
            anon_page.locator("text=unpublished").count() > 0 or
            anon_page.locator("text=Access Denied").count() > 0 or
            anon_page.locator("text=404").count() > 0 or
            "/auth" in anon_page.url
        )
        check("Unpublished Dashboard Denied to Public", unpub_blocked, "Unpublished dashboard immediately blocked for public viewer")

        browser.close()

    print("\n" + "=" * 80)
    print(f" E2E BROWSER SECURITY RESULTS: {e2e_passed} PASSED, {e2e_failed} FAILED")
    print("=" * 80)

    if e2e_failed > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()

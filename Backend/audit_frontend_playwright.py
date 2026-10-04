"""
RicozViz — Comprehensive Playwright Frontend & Security Deep-Scan
Navigates every single route across personas, records console errors,
network failures, visual stability, and security boundaries.
"""

import sys
import time
from playwright.sync_api import sync_playwright

FRONTEND_URL = "http://localhost:3000"
BACKEND_URL = "http://127.0.0.1:8000/api"

def run_deep_scan():
    print("=" * 80)
    print(" RICOZVIZ PLAYWRIGHT FRONTEND & SECURITY DEEP SCAN")
    print("=" * 80)

    console_errors = []
    network_errors = []
    page_audit_results = {}

    routes = [
        "/dashboard",
        "/dashboard/datasets",
        "/dashboard/explore",
        "/dashboard/visualisations",
        "/dashboard/dashboards",
        "/dashboard/ai-analyst",
        "/dashboard/data-detective",
        "/dashboard/pulse",
        "/dashboard/reports",
        "/dashboard/governance",
        "/dashboard/marketplace",
        "/dashboard/settings",
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # Listen to console events
        def on_console(msg):
            if msg.type in ("error",):
                console_errors.append(f"[{msg.location.get('url', 'unknown')}] {msg.text}")
                print(f"  [CONSOLE ERROR] {msg.text}")

        # Listen to response events for 4xx/5xx
        def on_response(res):
            if res.status >= 400 and "/api/health" not in res.url:
                # Ignore expected 401 on initial unauthenticated check
                if res.status == 401 and "/auth/me" in res.url and "/auth/login" in page.url:
                    return
                network_errors.append(f"{res.request.method} {res.url} -> {res.status}")
                print(f"  [NETWORK ERROR] {res.request.method} {res.url} -> {res.status}")

        page.on("console", on_console)
        page.on("response", on_response)

        # ----------------------------------------------------
        # 1. AUTHENTICATION & LOGIN AS ADMIN
        # ----------------------------------------------------
        print("\n[1] Logging in as Admin persona...")
        page.goto(f"{FRONTEND_URL}/auth/login", wait_until="networkidle")
        page.fill("input[type='email']", "admin@ricozviz.com")
        page.fill("input[type='password']", "admin123")
        page.click("button[type='submit']")
        page.wait_for_url("**/dashboard**", timeout=15000)
        page.wait_for_timeout(1000)
        print("  [+] Admin login succeeded")

        # ----------------------------------------------------
        # 2. SCANNING EVERY ROUTE AS ADMIN
        # ----------------------------------------------------
        print("\n[2] Scanning All Application Pages as Admin...")
        for route in routes:
            url = f"{FRONTEND_URL}{route}"
            print(f"  Visiting: {route} ...", end="", flush=True)
            try:
                page.goto(url, wait_until="networkidle")
                page.wait_for_timeout(1500)
                # Verify page rendered an h1 or main container
                h1_text = page.locator("h1").first.inner_text() if page.locator("h1").count() > 0 else "No H1"
                page_audit_results[route] = {"status": "OK", "title": h1_text}
                print(f" OK -> '{h1_text}'")
            except Exception as e:
                page_audit_results[route] = {"status": "FAILED", "error": str(e)}
                print(f" FAILED -> {e}")

        # ----------------------------------------------------
        # 3. INTERACTIVE FEATURE VERIFICATION
        # ----------------------------------------------------
        print("\n[3] Testing Interactive Features...")
        
        # Test Data Explorer filter interaction
        print("  Testing Data Explorer filtering...")
        page.goto(f"{FRONTEND_URL}/dashboard/explore", wait_until="networkidle")
        page.wait_for_timeout(1500)
        # Check if query controls exist
        has_run_btn = page.locator("button:has-text('Run Query')").count() > 0
        print(f"    Data Explorer Run Query button present: {has_run_btn}")

        # Test Dashboard Hub cards
        print("  Testing Dashboard Hub cards...")
        page.goto(f"{FRONTEND_URL}/dashboard/dashboards", wait_until="networkidle")
        page.wait_for_timeout(1500)
        dash_cards = page.locator("div[class*='cursor-pointer'], a[href*='/dashboard/dashboards/']").count()
        print(f"    Dashboards found: {dash_cards}")

        # Test AI Analyst interactive prompt
        print("  Testing AI Analyst question submission...")
        page.goto(f"{FRONTEND_URL}/dashboard/ai-analyst", wait_until="networkidle")
        page.wait_for_timeout(1500)
        chat_box = page.locator("input[placeholder*='Ask e.g.']")
        if chat_box.count() > 0:
            chat_box.fill("Top sales by region")
            page.locator("button[type='submit']").click()
            page.wait_for_timeout(3000)
            has_engine = page.locator("text=Deterministic Semantic Engine").count() > 0
            print(f"    AI Analyst responded with Engine badge: {has_engine}")

        # ----------------------------------------------------
        # 4. VIEWER RBAC ENFORCEMENT IN BROWSER
        # ----------------------------------------------------
        print("\n[4] Testing Viewer RBAC Boundaries...")
        page.goto(f"{FRONTEND_URL}/auth/login", wait_until="networkidle")
        page.evaluate("() => localStorage.clear()")
        context.clear_cookies()
        page.reload(wait_until="networkidle")

        page.fill("input[type='email']", "viewer@ricozviz.com")
        page.fill("input[type='password']", "viewer123")
        page.click("button[type='submit']")
        page.wait_for_url("**/dashboard**", timeout=15000)
        page.wait_for_timeout(1500)

        # Viewer should not see Governance in navigation
        gov_nav = page.locator("a[href*='/governance']").count()
        print(f"    Viewer navigation: Governance link count = {gov_nav} (Expected: 0)")

        # Direct navigation to Governance should show restricted/lock notice
        page.goto(f"{FRONTEND_URL}/dashboard/governance", wait_until="networkidle")
        page.wait_for_timeout(1500)
        has_lock = page.locator("text=Only Admin members can modify").count() > 0 or page.locator("text=Access Denied").count() > 0
        has_add_member = page.locator("#invite-member-btn").count() > 0
        print(f"    Viewer on Governance: Restricted notice visible = {has_lock}, Add Member button visible = {has_add_member}")

        browser.close()

    print("\n" + "=" * 80)
    print(" SCAN RESULTS SUMMARY")
    print("=" * 80)
    print(f"Console Errors: {len(console_errors)}")
    for ce in console_errors:
        print(f"  - {ce}")

    print(f"\nNetwork Errors: {len(network_errors)}")
    for ne in network_errors:
        print(f"  - {ne}")

    all_pages_ok = all(res.get("status") == "OK" for res in page_audit_results.values())
    print(f"\nAll Pages Rendered: {all_pages_ok}")

    if console_errors or network_errors or not all_pages_ok:
        print("\n[!] Issues detected that need review/fixing.")
        sys.exit(1)
    else:
        print("\n[+] ZERO console errors, ZERO network errors, ALL pages healthy!")
        sys.exit(0)

if __name__ == "__main__":
    run_deep_scan()

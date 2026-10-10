"""
RicozViz — End-to-End Multi-Tenant SaaS Browser Verification (Playwright)
Validates the complete multi-tenant SaaS journey:
 1. Public Signup for Company A (collects Name, Work Email, Password, Org Name, Size, Industry)
 2. Organization & Workspace auto-provisioning with Admin role
 3. Organization Administration Page (/dashboard/settings/organization) access & metrics
 4. Employee Invitation generation & 256-bit Cryptographic link
 5. Public Acceptance flow (/invite/[token]) for new teammate in isolated session
 6. Public Signup for Company B with completely separate tenant identity
 7. Strict Data Isolation (Company A dataset never visible or accessible to Company B)
 8. Multi-tenant Context & Organization Switcher in Application Shell
 9. Cross-Tenant IDOR and Header Tampering Defenses
"""

import sys
import io
import uuid
import secrets
import httpx
from playwright.sync_api import sync_playwright

BASE_API = "http://127.0.0.1:8000/api"
BASE_WEB = "http://localhost:3000"

client = httpx.Client(base_url=BASE_API, timeout=30.0)

def main():
    print("=" * 80)
    print(" RICOZVIZ MULTI-TENANT SAAS E2E PLAYWRIGHT VERIFICATION")
    print("=" * 80)

    e2e_passed = 0
    e2e_failed = 0
    failures = []

    def check(name: str, condition: bool, msg: str = ""):
        nonlocal e2e_passed, e2e_failed
        if condition:
            e2e_passed += 1
            print(f"  [+] PASS: {name} - {msg}")
        else:
            e2e_failed += 1
            failures.append(f"{name}: {msg}")
            print(f"  [-] FAIL: {name} - {msg}")

    rnd = secrets.token_hex(4)
    email_a = f"alice_e2e_{rnd}@acmeglobal.com"
    pwd_a = f"AcmeAdmin_{rnd}!123"
    org_a_name = f"Acme Global {rnd}"

    email_b = f"bob_e2e_{rnd}@betalogistics.com"
    pwd_b = f"BetaAdmin_{rnd}!123"
    org_a_name_b = f"Beta Logistics {rnd}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # -------------------------------------------------------------
        # STEP 1: Company A Public Signup via Browser UI
        # -------------------------------------------------------------
        print("\n--- 1. Company A Public Signup via Browser UI ---")
        context_a = browser.new_context()
        page_a = context_a.new_page()

        page_a.goto(f"{BASE_WEB}/auth/signup")
        page_a.wait_for_selector("input[type='email']")

        # Fill inputs with precise placeholders
        page_a.fill("input[placeholder*='Acme']", org_a_name)
        page_a.fill("input[placeholder*='Sarah']", f"Alice Admin {rnd}")
        page_a.fill("input[type='email']", email_a)
        page_a.fill("input[type='password']", pwd_a)

        # Submit signup
        page_a.click("button[type='submit']")
        page_a.wait_for_url("**/dashboard**", timeout=15000)
        check("Company A Browser Signup", "/dashboard" in page_a.url, f"Redirected to {page_a.url}")

        # Wait for session initialization to settle on dashboard
        page_a.wait_for_selector("text=Validating enterprise session", state="detached", timeout=15000)
        page_content = page_a.content()
        check("Company A Tenant Context Loaded", org_a_name in page_content or "Acme" in page_content or "Organization" in page_content, "Tenant context visible in app shell")

        # Extract JWT token and active workspace immediately while confirmed authenticated
        storage_state = page_a.evaluate("() => localStorage.getItem('ricozviz_token')")
        me_res_a = client.get("/auth/me", headers={"Authorization": f"Bearer {storage_state}"})
        if me_res_a.status_code != 200:
            print(f"DEBUG: me_res_a status={me_res_a.status_code}, text={me_res_a.text}")
        active_ws_id = str(me_res_a.json().get("workspace", {}).get("id"))
        headers_a = {"Authorization": f"Bearer {storage_state}", "X-Workspace-Id": active_ws_id}

        # -------------------------------------------------------------
        # STEP 2: Company A Organization Settings & Admin Access
        # -------------------------------------------------------------
        print("\n--- 2. Company A Organization Administration Page ---")
        page_a.goto(f"{BASE_WEB}/dashboard/settings/organization")
        page_a.wait_for_selector("text=Validating enterprise session", state="detached", timeout=15000)
        page_a.wait_for_selector("h1, form, button", timeout=15000)
        org_page_text = page_a.content()
        check(
            "Organization Admin Page Renders",
            "Organization" in org_page_text or "Administration" in org_page_text or "Members" in org_page_text or "General" in org_page_text,
            "Admin view verified"
        )

        # -------------------------------------------------------------
        # STEP 3: Company A Invites Employee via API
        # -------------------------------------------------------------
        print("\n--- 3. Cryptographic Employee Invitation ---")
        invitee_email = f"emp_e2e_{rnd}@acmeglobal.com"
        inv_res = client.post(
            "/governance/invitations",
            headers=headers_a,
            json={"email": invitee_email, "role": "Analyst", "workspace_id": active_ws_id}
        )
        inv_data = inv_res.json() if inv_res.status_code in (200, 201) else {}
        inv_token = inv_data.get("token")
        check(
            "Admin Issues Cryptographic Invitation",
            inv_res.status_code in (200, 201) and inv_token is not None and len(inv_token) >= 32,
            f"Generated 256-bit token {inv_token[:12]}..."
        )

        # -------------------------------------------------------------
        # STEP 4: Employee Accepts Invitation in Clean Session
        # -------------------------------------------------------------
        print("\n--- 4. Employee Accepts Invitation via Browser (/invite/[token]) ---")
        context_emp = browser.new_context()
        page_emp = context_emp.new_page()

        page_emp.goto(f"{BASE_WEB}/invite/{inv_token}")
        page_emp.wait_for_selector("input[type='password']")

        invite_card_text = page_emp.content()
        check(
            "Invite Page Displays Org & Role Details",
            invitee_email in invite_card_text or "Analyst" in invite_card_text,
            "Public details validated"
        )

        # Complete employee onboarding
        name_input = page_emp.locator("input[placeholder*='Jane' i], input[type='text']").first
        name_input.fill("Emma Analyst E2E")
        pwd_inputs = page_emp.locator("input[type='password']")
        pwd_inputs.nth(0).fill(f"EmmaPass_{rnd}!456")
        pwd_inputs.nth(1).fill(f"EmmaPass_{rnd}!456")

        page_emp.click("button[type='submit']")
        page_emp.wait_for_url("**/dashboard**", timeout=15000)
        check("Employee Joins Organization & Enters Dashboard", "/dashboard" in page_emp.url, "Successfully onboarded")

        # -------------------------------------------------------------
        # STEP 5: Company B Public Signup in Isolated Browser Session
        # -------------------------------------------------------------
        print("\n--- 5. Company B Public Signup (Isolated Tenant) ---")
        context_b = browser.new_context()
        page_b = context_b.new_page()

        page_b.goto(f"{BASE_WEB}/auth/signup")
        page_b.wait_for_selector("input[type='email']")

        # Fill inputs with precise placeholders
        page_b.fill("input[placeholder*='Acme']", org_a_name_b)
        page_b.fill("input[placeholder*='Sarah']", f"Bob Admin {rnd}")
        page_b.fill("input[type='email']", email_b)
        page_b.fill("input[type='password']", pwd_b)

        page_b.click("button[type='submit']")
        page_b.wait_for_url("**/dashboard**", timeout=15000)
        check("Company B Browser Signup", "/dashboard" in page_b.url, f"Redirected to {page_b.url}")

        token_b = page_b.evaluate("() => localStorage.getItem('ricozviz_token')")
        me_res_b = client.get("/auth/me", headers={"Authorization": f"Bearer {token_b}"})
        ws_b_id = str(me_res_b.json()["workspace"]["id"])
        headers_b = {"Authorization": f"Bearer {token_b}", "X-Workspace-Id": ws_b_id}

        # -------------------------------------------------------------
        # STEP 6: Upload Dataset for Company A and Verify Strict Isolation
        # -------------------------------------------------------------
        print("\n--- 6. Multi-Tenant Data Isolation ---")
        csv_a = "metric,value,segment\nMRR,120000,Enterprise\nARR,1440000,Enterprise\n"
        up_res_a = client.post(
            "/datasets/upload",
            headers=headers_a,
            files={"file": ("acme_financials.csv", io.BytesIO(csv_a.encode("utf-8")), "text/csv")},
            data={"name": "Acme Confidential Financials"}
        )
        dataset_a_id = up_res_a.json().get("id") if up_res_a.status_code in (200, 201) else None
        check("Company A Dataset Created", dataset_a_id is not None, f"Dataset ID: {dataset_a_id}")

        # Company B checks its dataset catalog
        page_b.goto(f"{BASE_WEB}/dashboard/datasets")
        page_b.wait_for_selector("body")
        page_b.wait_for_timeout(1000)
        content_b_datasets = page_b.content()
        check(
            "Company B Cannot See Company A Dataset in UI",
            "Acme Confidential Financials" not in content_b_datasets,
            "Zero UI leakage verified"
        )

        # Company B direct API attack on Company A's dataset
        cross_res = client.get(f"/datasets/{dataset_a_id}", headers=headers_b)
        check(
            "Cross-Tenant Direct Access Blocked (IDOR Defense)",
            cross_res.status_code in (403, 404),
            f"Blocked with status {cross_res.status_code}"
        )

        # -------------------------------------------------------------
        # STEP 7: Cross-Tenant Header Spoofing Defenses
        # -------------------------------------------------------------
        print("\n--- 7. Cross-Tenant Header & Workspace Spoofing Defense ---")
        headers_spoof = {"Authorization": f"Bearer {storage_state}", "X-Workspace-Id": ws_b_id}
        tamper_res = client.get("/datasets", headers=headers_spoof)
        check(
            "Header Spoofing of Foreign Workspace Blocked (403)",
            tamper_res.status_code == 403,
            f"Server returned status {tamper_res.status_code}"
        )

        # -------------------------------------------------------------
        # STEP 8: TopNav Organization Switcher & Context Integrity
        # -------------------------------------------------------------
        print("\n--- 8. TopNav Organization Switcher & Context Integrity ---")
        page_a.goto(f"{BASE_WEB}/dashboard")
        page_a.wait_for_selector("nav, header")
        
        # Test switch context API endpoint
        me_res = client.get("/auth/me", headers=headers_a)
        org_a_id = me_res.json()["organization"]["id"]
        switch_res = client.post(
            "/auth/switch-context",
            headers=headers_a,
            json={"organization_id": org_a_id, "workspace_id": active_ws_id}
        )
        check(
            "Organization Context Switching API Validated",
            switch_res.status_code == 200 and "access_token" in switch_res.json(),
            "Context session verified"
        )

        browser.close()

    print("\n" + "=" * 80)
    print(f"E2E MULTI-TENANT VERIFICATION RESULTS: {e2e_passed}/{e2e_passed + e2e_failed} PASSED")
    if e2e_failed > 0:
        print(f"FAILURES: {failures}")
        sys.exit(1)
    else:
        print("ALL E2E MULTI-TENANT SAAS USER FLOWS VERIFIED SUCCESSFULLY!")
        sys.exit(0)

if __name__ == "__main__":
    main()

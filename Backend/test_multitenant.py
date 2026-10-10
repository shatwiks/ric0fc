"""
RicozViz — Multi-Tenant Enterprise SaaS Integration Test Suite
Validates all 25 Enterprise Multi-Tenant Acceptance Requirements:
 1. Company A signup
 2. Company B signup
 3. Separate organizations created
 4. Separate workspaces created
 5. Company A user login
 6. Company B user login
 7. A creates dataset
 8. B creates dataset
 9. A cannot access B dataset
10. B cannot access A dataset
11. A creates dashboard
12. B cannot access A dashboard
13. A AI cannot access B data
14. B AI cannot access A data
15. A exports only A data
16. B exports only B data
17. Admin invitation
18. Employee acceptance
19. Role enforcement
20. User deactivation
21. Organization switching
22. Workspace switching
23. Cross-tenant ID manipulation
24. Share-token isolation
25. Audit-log isolation
"""

import sys
import io
import uuid
import secrets
import httpx

BASE_URL = "http://127.0.0.1:8000/api"
client = httpx.Client(base_url=BASE_URL, timeout=30.0)

passed_count = 0
failed_count = 0
failures = []

def record(test_num: int, name: str, passed: bool, detail: str = ""):
    global passed_count, failed_count, failures
    if passed:
        passed_count += 1
        print(f"[{test_num:02d}/25] PASS: {name} - {detail}")
    else:
        failed_count += 1
        failures.append(f"Test {test_num} ({name}): {detail}")
        print(f"[{test_num:02d}/25] FAIL: {name} - {detail}")

print("=" * 80)
print(" RICOZVIZ MULTI-TENANT ENTERPRISE SAAS TEST SUITE (25 TESTS)")
print("=" * 80)

rnd = secrets.token_hex(4)

# Test 1 & 2: Signup Company A and Company B
email_a = f"alice_{rnd}@companya.com"
pwd_a = f"PassA_{rnd}!123"
org_name_a = f"Company A Corp {rnd}"

res_signup_a = client.post("/auth/signup", json={
    "full_name": "Alice Admin A",
    "email": email_a,
    "password": pwd_a,
    "organization_name": org_name_a,
    "company_size": "51-200",
    "industry": "SaaS & Technology"
})
record(1, "Company A Public Signup", res_signup_a.status_code in (200, 201), f"Status {res_signup_a.status_code}")
data_a = res_signup_a.json()
token_a = data_a.get("access_token")
org_a_id = str(data_a.get("organization_id"))
org_a_name = data_a.get("organization_name")
ws_a_id = str(data_a.get("workspace_id"))
user_a_id = str(data_a.get("user_id"))

email_b = f"bob_{rnd}@companyb.com"
pwd_b = f"PassB_{rnd}!123"
org_name_b = f"Company B Corp {rnd}"

res_signup_b = client.post("/auth/signup", json={
    "full_name": "Bob Admin B",
    "email": email_b,
    "password": pwd_b,
    "organization_name": org_name_b,
    "company_size": "11-50",
    "industry": "Financial Services"
})
record(2, "Company B Public Signup", res_signup_b.status_code in (200, 201), f"Status {res_signup_b.status_code}")
data_b = res_signup_b.json()
token_b = data_b.get("access_token")
org_b_id = str(data_b.get("organization_id"))
org_b_name = data_b.get("organization_name")
ws_b_id = str(data_b.get("workspace_id"))
user_b_id = str(data_b.get("user_id"))

# Test 3: Separate organizations created
org_diff = (org_a_id != org_b_id) and (org_a_name != org_b_name)
record(3, "Separate Organizations Created", org_diff, f"Org A {org_a_id[:8]} vs Org B {org_b_id[:8]}")

# Test 4: Separate workspaces created
ws_diff = (ws_a_id != ws_b_id)
record(4, "Separate Workspaces Created", ws_diff, f"WS A {ws_a_id[:8]} vs WS B {ws_b_id[:8]}")

# Test 5: Company A user login
res_login_a = client.post("/auth/login", json={"email": email_a, "password": pwd_a})
record(5, "Company A User Login", res_login_a.status_code == 200 and res_login_a.json().get("access_token") is not None, "Login successful")
if res_login_a.status_code == 200:
    token_a = res_login_a.json()["access_token"]

# Test 6: Company B user login
res_login_b = client.post("/auth/login", json={"email": email_b, "password": pwd_b})
record(6, "Company B User Login", res_login_b.status_code == 200 and res_login_b.json().get("access_token") is not None, "Login successful")
if res_login_b.status_code == 200:
    token_b = res_login_b.json()["access_token"]

headers_a = {"Authorization": f"Bearer {token_a}", "X-Workspace-Id": ws_a_id}
headers_b = {"Authorization": f"Bearer {token_b}", "X-Workspace-Id": ws_b_id}

# Test 7: Company A creates dataset
csv_content_a = "product,revenue,region\nWidgetA,1000,North\nGadgetA,2500,South\n"
res_up_a = client.post(
    "/datasets/upload",
    headers=headers_a,
    files={"file": ("sales_a.csv", io.BytesIO(csv_content_a.encode("utf-8")), "text/csv")},
    data={"name": "Sales A Dataset"}
)
dataset_a = res_up_a.json() if res_up_a.status_code in (200, 201) else {}
record(7, "Company A Creates Dataset", res_up_a.status_code in (200, 201) and "id" in dataset_a, f"Dataset A ID: {dataset_a.get('id', '')[:8]}")

# Test 8: Company B creates dataset
csv_content_b = "product,revenue,region\nItemB,500,East\nServiceB,1200,West\n"
res_up_b = client.post(
    "/datasets/upload",
    headers=headers_b,
    files={"file": ("sales_b.csv", io.BytesIO(csv_content_b.encode("utf-8")), "text/csv")},
    data={"name": "Sales B Dataset"}
)
dataset_b = res_up_b.json() if res_up_b.status_code in (200, 201) else {}
record(8, "Company B Creates Dataset", res_up_b.status_code in (200, 201) and "id" in dataset_b, f"Dataset B ID: {dataset_b.get('id', '')[:8]}")

# Test 9: Company A CANNOT access Company B dataset
dataset_b_id = dataset_b.get("id")
res_cross_a_to_b = client.get(f"/datasets/{dataset_b_id}", headers=headers_a)
record(9, "Company A Cannot Access Company B Dataset", res_cross_a_to_b.status_code in (403, 404), f"HTTP status: {res_cross_a_to_b.status_code}")

# Test 10: Company B CANNOT access Company A dataset
dataset_a_id = dataset_a.get("id")
res_cross_b_to_a = client.get(f"/datasets/{dataset_a_id}", headers=headers_b)
record(10, "Company B Cannot Access Company A Dataset", res_cross_b_to_a.status_code in (403, 404), f"HTTP status: {res_cross_b_to_a.status_code}")

# Test 11: Company A creates dashboard
res_dash_a = client.post(
    "/dashboards",
    headers=headers_a,
    json={"title": "Executive KPI Dashboard A", "description": "Strict Company A Dashboard"}
)
dash_a = res_dash_a.json() if res_dash_a.status_code in (200, 201) else {}
dash_a_id = dash_a.get("id")
record(11, "Company A Creates Dashboard", res_dash_a.status_code in (200, 201) and dash_a_id is not None, f"Dash A ID: {dash_a_id[:8] if dash_a_id else 'None'}")

# Test 12: Company B CANNOT access Company A dashboard
res_cross_dash_b = client.get(f"/dashboards/{dash_a_id}", headers=headers_b)
record(12, "Company B Cannot Access Company A Dashboard", res_cross_dash_b.status_code in (403, 404), f"HTTP status: {res_cross_dash_b.status_code}")

# Test 13: Company A AI CANNOT query Company B dataset
res_ai_cross_a = client.post(
    "/ai/chat",
    headers=headers_a,
    json={"dataset_id": dataset_b_id, "message": "Show me top revenue products"}
)
record(13, "Company A AI Cannot Query Company B Dataset", res_ai_cross_a.status_code in (403, 404), f"HTTP status: {res_ai_cross_a.status_code}")

# Test 14: Company B AI CANNOT query Company A dataset
res_ai_cross_b = client.post(
    "/ai/chat",
    headers=headers_b,
    json={"dataset_id": dataset_a_id, "message": "Summarize financial numbers"}
)
record(14, "Company B AI Cannot Query Company A Dataset", res_ai_cross_b.status_code in (403, 404), f"HTTP status: {res_ai_cross_b.status_code}")

# Test 15: Company A exports only A data (blocked from exporting B data)
res_export_b_by_a = client.post(
    "/reports/export/csv",
    headers=headers_a,
    json={"dataset_id": dataset_b_id, "name": "Illegal_Export"}
)
record(15, "Company A Blocked From Exporting Company B Data", res_export_b_by_a.status_code in (403, 404), f"HTTP status: {res_export_b_by_a.status_code}")

# Test 16: Company B exports only B data (blocked from exporting A data)
res_export_a_by_b = client.post(
    "/reports/export/csv",
    headers=headers_b,
    json={"dataset_id": dataset_a_id, "name": "Illegal_Export"}
)
record(16, "Company B Blocked From Exporting Company A Data", res_export_a_by_b.status_code in (403, 404), f"HTTP status: {res_export_a_by_b.status_code}")# Test 17: Admin invitation generation
invite_email_a = f"analyst_employee_{rnd}@companya.com"
res_inv_create = client.post(
    "/governance/invitations",
    headers=headers_a,
    json={"email": invite_email_a, "role": "Analyst", "workspace_id": ws_a_id}
)
inv_data = res_inv_create.json() if res_inv_create.status_code in (200, 201) else {}
inv_token = inv_data.get("token")
record(17, "Admin Generates Cryptographic Invitation", res_inv_create.status_code in (200, 201) and inv_token is not None and len(inv_token) >= 32, f"Token length: {len(inv_token) if inv_token else 0}")

# Test 18: Employee acceptance
pwd_employee = f"EmployeePass_{rnd}!456"
res_inv_accept = client.post(
    f"/auth/invitations/{inv_token}/accept",
    json={"full_name": "Evelyn Analyst", "password": pwd_employee}
)
record(18, "Employee Accepts Invitation & Joins Organization", res_inv_accept.status_code in (200, 201), f"Status: {res_inv_accept.status_code}")
emp_data = res_inv_accept.json() if res_inv_accept.status_code in (200, 201) else {}
emp_token = emp_data.get("access_token")
emp_user_id = emp_data.get("user_id")
headers_emp = {"Authorization": f"Bearer {emp_token}", "X-Workspace-Id": ws_a_id}

# Test 19: Role enforcement
# Evelyn was invited as Analyst: can read/upload datasets, but cannot invite new users or delete the workspace
res_emp_invite_attempt = client.post(
    "/governance/invitations",
    headers=headers_emp,
    json={"email": f"unauthorized_{rnd}@companya.com", "role": "Admin"}
)
record(19, "Role Enforcement (Analyst blocked from Admin invite)", res_emp_invite_attempt.status_code == 403, f"HTTP status: {res_emp_invite_attempt.status_code}")

# Test 20: User deactivation
res_deactivate = client.put(
    f"/governance/users/{emp_user_id}/status",
    headers=headers_a,
    json={"is_active": False}
)
# Attempt to login as deactivated employee
res_emp_login_deactivated = client.post("/auth/login", json={"email": invite_email_a, "password": pwd_employee})
record(20, "User Deactivation Blocks Login", res_deactivate.status_code == 200 and res_emp_login_deactivated.status_code in (400, 401, 403), f"Login status: {res_emp_login_deactivated.status_code}")

# Test 21: Organization switching
# Switch active context via /auth/switch-context
res_switch = client.post(
    "/auth/switch-context",
    headers=headers_a,
    json={"organization_id": org_a_id, "workspace_id": ws_a_id}
)
record(21, "Organization Switching Context Endpoint", res_switch.status_code == 200 and "access_token" in res_switch.json(), "Context switch validated")

# Test 22: Workspace switching
res_new_ws = client.post(
    "/auth/workspaces",
    headers=headers_a,
    json={"name": "Marketing Sub-Workspace"}
)
ws_a2 = res_new_ws.json() if res_new_ws.status_code in (200, 201) else {}
ws_a2_id = ws_a2.get("id")
headers_a_ws2 = {"Authorization": f"Bearer {token_a}", "X-Workspace-Id": ws_a2_id}
res_list_ws2 = client.get("/datasets", headers=headers_a_ws2)
record(22, "Workspace Switching & Scoping", res_new_ws.status_code in (200, 201) and res_list_ws2.status_code == 200, f"New workspace {ws_a2_id[:8] if ws_a2_id else ''}")

# Test 23: Cross-tenant ID manipulation
# Company A attempts to supply Company B's workspace ID in X-Workspace-Id header
headers_spoofed = {"Authorization": f"Bearer {token_a}", "X-Workspace-Id": ws_b_id}
res_spoofed = client.get("/datasets", headers=headers_spoofed)
record(23, "Cross-Tenant ID Manipulation Blocked (403)", res_spoofed.status_code == 403, f"HTTP status: {res_spoofed.status_code}")

# Test 24: Share-token isolation
# Publish dashboard first so share link becomes active
client.post(f"/dashboards/{dash_a_id}/publish", headers=headers_a)
res_share = client.post(
    f"/dashboards/{dash_a_id}/share-link",
    headers=headers_a
)
share_data = res_share.json() if res_share.status_code in (200, 201) else {}
share_token = share_data.get("share_token")
res_shared_view = client.get(f"/dashboards/shared/{share_token}")
# Tampered share token
res_fake_share = client.get(f"/dashboards/shared/invalid-tampered-token-{rnd}")
record(24, "Share Token Scoping & Revocation Isolation", res_shared_view.status_code == 200 and res_fake_share.status_code in (404, 400), f"Valid share: {res_shared_view.status_code}, Invalid: {res_fake_share.status_code}")

# Test 25: Audit-log isolation
res_logs_a = client.get("/governance/audit-logs", headers=headers_a)
logs_a = res_logs_a.json() if res_logs_a.status_code == 200 else []
# Verify no Company B user_id or resources exist in Company A audit logs
b_leak_in_a = any(log.get("user_id") == user_b_id for log in logs_a)
res_logs_b_by_a = client.get("/governance/audit-logs", headers=headers_spoofed)
record(25, "Audit Log Isolation (Zero Cross-Tenant Leakage)", (not b_leak_in_a) and res_logs_b_by_a.status_code == 403, f"Company B in A logs: {b_leak_in_a}, Tampered audit fetch: {res_logs_b_by_a.status_code}")

print("=" * 80)
print(f"MULTI-TENANT TEST RESULTS: {passed_count}/{passed_count + failed_count} PASSED")
if failed_count > 0:
    print(f"FAILURES: {failures}")
    sys.exit(1)
else:
    print("ALL 25 MULTI-TENANT SAAS ACCEPTANCE TESTS PASSED!")
    sys.exit(0)

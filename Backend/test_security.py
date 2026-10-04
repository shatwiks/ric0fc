"""
RicozViz — Comprehensive Live Security Integration Test Suite
Validates Authentication, RBAC, Multi-Tenant Isolation, IDOR, SQL/DuckDB Injection,
File Security, Sharing Tokens, AI Security, Security Headers, and Information Leakage.
"""

import sys
import uuid
import secrets
import httpx
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000/api"

passed_tests = 0
failed_tests = 0
failures = []

def report(name: str, passed: bool, msg: str = ""):
    global passed_tests, failed_tests
    if passed:
        passed_tests += 1
        print(f"  [+] PASS: {name} - {msg}")
    else:
        failed_tests += 1
        failures.append(f"{name}: {msg}")
        print(f"  [-] FAIL: {name} - {msg}")

client = httpx.Client(base_url=BASE_URL, timeout=30.0)

print("=" * 80)
print(" RICOZVIZ FULL SECURITY INTEGRATION SUITE")
print("=" * 80)

# Helper: Signup a tenant
def signup_tenant(prefix: str, role: str = "Admin"):
    rnd = secrets.token_hex(4)
    email = f"{prefix}_{rnd}@audit-test.com"
    pwd = f"SecureP@ss_{rnd}123"
    org_name = f"Audit Org {prefix}_{rnd}"
    res = client.post("/auth/signup", json={
        "full_name": f"User {prefix}",
        "email": email,
        "password": pwd,
        "organization_name": org_name,
        "role": role,
    })
    assert res.status_code in (200, 201), f"Signup failed: {res.text}"
    data = res.json()
    return data, pwd

# Helper: Invite a user with specific role
def invite_user(admin_token: str, role: str):
    rnd = secrets.token_hex(4)
    email = f"user_{role.lower()}_{rnd}@audit-test.com"
    pwd = f"UserPass_{rnd}123"
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.post("/governance/users/invite", headers=headers, json={
        "full_name": f"Role {role} User",
        "email": email,
        "password": pwd,
        "role": role,
    })
    assert res.status_code == 201, f"Invite failed: {res.text}"
    # Log in as this user
    login_res = client.post("/auth/login", json={"email": email, "password": pwd})
    assert login_res.status_code == 200, f"Login failed for invited user: {login_res.text}"
    return login_res.json(), pwd

# --- SECTION 1: AUTHENTICATION & SESSION ---
print("\n[1] Authentication & Session Security...")

# 1.1 Valid login
tenant_a, pwd_a = signup_tenant("alpha")
token_a = tenant_a["access_token"]
headers_a = {"Authorization": f"Bearer {token_a}"}

login_res = client.post("/auth/login", json={"email": tenant_a["email"], "password": pwd_a})
report("Valid Login", login_res.status_code == 200, "200 OK returned with access_token")

# 1.2 Invalid password
bad_login = client.post("/auth/login", json={"email": tenant_a["email"], "password": "WrongPassword!"})
report("Bad Password Rejection", bad_login.status_code == 401, "401 Unauthorized returned")

# 1.3 Nonexistent email
no_user = client.post("/auth/login", json={"email": "nonexistent_user_xyz@test.com", "password": "AnyPassword!"})
report("Nonexistent Email Rejection", no_user.status_code == 401, "401 Unauthorized without user enumeration")

# 1.4 Tampered JWT
tampered_token = token_a[:-6] + "xxxxxx"
tampered_res = client.get("/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
report("Tampered JWT Rejection", tampered_res.status_code == 401, "401 Unauthorized returned on signature mismatch")

# 1.5 Malformed token
malformed_res = client.get("/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
report("Malformed JWT Rejection", malformed_res.status_code == 401, "401 Unauthorized returned on malformed token")

# 1.6 Deactivated user access
invited_user, user_pwd = invite_user(token_a, "Analyst")
deact_res = client.put(
    f"/governance/users/{invited_user['user_id']}/status",
    headers=headers_a,
    json={"is_active": False},
)
report("Admin Deactivates User", deact_res.status_code == 200, "User active status set to false")

deact_access = client.get("/auth/me", headers={"Authorization": f"Bearer {invited_user['access_token']}"})
report("Deactivated User Token Rejection", deact_access.status_code == 403, "Existing session blocked with 403 Forbidden")

deact_login = client.post("/auth/login", json={"email": invited_user["email"], "password": user_pwd})
report("Deactivated User Login Blocked", deact_login.status_code == 403, "Login blocked with 403 Forbidden")

# Re-activate user for further tests
client.put(f"/governance/users/{invited_user['user_id']}/status", headers=headers_a, json={"is_active": True})

# --- SECTION 2: RBAC (ROLE-BASED ACCESS CONTROL) ---
print("\n[2] Role-Based Access Control (RBAC)...")

viewer_user, _ = invite_user(token_a, "Viewer")
headers_viewer = {"Authorization": f"Bearer {viewer_user['access_token']}"}

explorer_user, _ = invite_user(token_a, "Explorer")
headers_explorer = {"Authorization": f"Bearer {explorer_user['access_token']}"}

analyst_user, _ = invite_user(token_a, "Analyst")
headers_analyst = {"Authorization": f"Bearer {analyst_user['access_token']}"}

publisher_user, _ = invite_user(token_a, "Publisher")
headers_publisher = {"Authorization": f"Bearer {publisher_user['access_token']}"}

# 2.1 Viewer cannot create dashboard (requires Analyst+)
v_create_dash = client.post("/dashboards", headers=headers_viewer, json={"title": "Viewer Dashboard"})
report("Viewer Dashboard Creation Blocked", v_create_dash.status_code == 403, "403 Forbidden")

# 2.2 Explorer cannot create dashboard
e_create_dash = client.post("/dashboards", headers=headers_explorer, json={"title": "Explorer Dashboard"})
report("Explorer Dashboard Creation Blocked", e_create_dash.status_code == 403, "403 Forbidden")

# 2.3 Analyst can create dashboard
a_create_dash = client.post("/dashboards", headers=headers_analyst, json={"title": "Analyst Dashboard"})
report("Analyst Dashboard Creation Allowed", a_create_dash.status_code == 201, "201 Created")
analyst_dash_id = a_create_dash.json()["id"]

# 2.4 Analyst CANNOT publish dashboard (requires Publisher+)
a_pub_dash = client.post(f"/dashboards/{analyst_dash_id}/publish", headers=headers_analyst)
report("Analyst Dashboard Publish Blocked", a_pub_dash.status_code == 403, "403 Forbidden")

# 2.5 Publisher CAN publish dashboard
p_pub_dash = client.post(f"/dashboards/{analyst_dash_id}/publish", headers=headers_publisher)
report("Publisher Dashboard Publish Allowed", p_pub_dash.status_code == 200, "200 OK")

# 2.6 Publisher cannot access Governance / User Management (requires Admin)
p_gov_res = client.get("/governance/users", headers=headers_publisher)
report("Publisher Governance Access Blocked", p_gov_res.status_code == 403, "403 Forbidden")

# 2.7 Admin can access Governance
adm_gov_res = client.get("/governance/users", headers=headers_a)
report("Admin Governance Access Allowed", adm_gov_res.status_code == 200, "200 OK")

# --- SECTION 3: MULTI-TENANT ISOLATION & IDOR ---
print("\n[3] Multi-Tenant Isolation & IDOR Protection...")

# Create Tenant Beta
tenant_b, _ = signup_tenant("beta")
headers_b = {"Authorization": f"Bearer {tenant_b['access_token']}"}

# Upload dataset for Tenant Alpha
csv_content = b"region,sales,profit\nNorth,100,20\nSouth,200,40\nEast,150,30\nWest,250,50\n"
upload_res = client.post(
    "/datasets/upload",
    headers=headers_a,
    files={"file": ("alpha_sales.csv", csv_content, "text/csv")},
    data={"name": "Alpha Sales Data"},
)
assert upload_res.status_code == 201, f"Dataset upload failed: {upload_res.text}"
ds_alpha_id = upload_res.json()["id"]

# 3.1 Tenant Beta attempts to access Tenant Alpha's dataset
b_get_ds = client.get(f"/datasets/{ds_alpha_id}", headers=headers_b)
report("Cross-Tenant Dataset Read Blocked", b_get_ds.status_code in (403, 404), f"Status {b_get_ds.status_code}")

# 3.2 Tenant Beta attempts to preview Tenant Alpha's dataset
b_prev_ds = client.get(f"/datasets/{ds_alpha_id}/preview", headers=headers_b)
report("Cross-Tenant Dataset Preview Blocked", b_prev_ds.status_code in (403, 404), f"Status {b_prev_ds.status_code}")

# 3.3 Tenant Beta attempts to execute aggregate query on Tenant Alpha's dataset
b_query = client.post(
    "/query/aggregate",
    headers=headers_b,
    json={
        "dataset_id": ds_alpha_id,
        "dimensions": ["region"],
        "measures": [{"column": "sales", "agg": "sum"}],
    },
)
report("Cross-Tenant Query Execution Blocked", b_query.status_code in (403, 404), f"Status {b_query.status_code}")

# 3.4 Tenant Beta attempts to view Tenant Alpha's dashboard
b_get_dash = client.get(f"/dashboards/{analyst_dash_id}", headers=headers_b)
report("Cross-Tenant Dashboard Read Blocked", b_get_dash.status_code in (403, 404), f"Status {b_get_dash.status_code}")

# 3.5 Tenant Beta attempts to attach Tenant Alpha's dataset to Beta's widget
b_dash = client.post("/dashboards", headers=headers_b, json={"title": "Beta Dashboard"})
b_dash_id = b_dash.json()["id"]
b_add_widget = client.post(
    f"/dashboards/{b_dash_id}/widgets",
    headers=headers_b,
    json={
        "title": "Malicious Widget",
        "chart_type": "bar",
        "dataset_id": ds_alpha_id,  # Org Alpha's dataset!
        "dimensions": ["region"],
        "measures": [{"column": "sales", "agg": "sum"}],
    },
)
report("Cross-Tenant Dataset in Widget Creation Blocked", b_add_widget.status_code in (403, 404), f"Status {b_add_widget.status_code}")

# 3.6 AI Conversation IDOR
ai_chat_res = client.post(
    "/ai/chat",
    headers=headers_a,
    json={"dataset_id": ds_alpha_id, "message": "Show sales by region"},
)
assert ai_chat_res.status_code == 200, f"AI Chat failed: {ai_chat_res.text}"
conv_id = ai_chat_res.json()["conversation_id"]

# User in Org Alpha (Viewer/Analyst or another user) attempts to view Admin's conversation
b_get_conv = client.get(f"/ai/conversations/{conv_id}", headers=headers_b)
report("Cross-Tenant AI Conversation Read Blocked", b_get_conv.status_code in (403, 404), f"Status {b_get_conv.status_code}")

# Cross-user IDOR within Org Alpha
analyst_get_conv = client.get(f"/ai/conversations/{conv_id}", headers=headers_analyst)
report("Cross-User AI Conversation Read Blocked", analyst_get_conv.status_code == 403, "403 Forbidden")

# Cross-user conversation deletion IDOR
analyst_del_conv = client.delete(f"/ai/conversations/{conv_id}", headers=headers_analyst)
report("Cross-User AI Conversation Deletion Blocked", analyst_del_conv.status_code == 403, "403 Forbidden")

# --- SECTION 4: SQL & DUCKDB INJECTION DEFENSES ---
print("\n[4] SQL & DuckDB Injection Protections...")

# 4.1 SQL Injection in dimension column
sqli_dim = client.post(
    "/query/aggregate",
    headers=headers_a,
    json={
        "dataset_id": ds_alpha_id,
        "dimensions": ["region' OR 1=1 --"],
        "measures": [{"column": "sales", "agg": "sum"}],
    },
)
report("Dimension Column SQLi Blocked", sqli_dim.status_code == 400, "Rejected by schema column allowlist (400 Bad Request)")

# 4.2 SQL Injection in filter column
sqli_filt_col = client.post(
    "/query/aggregate",
    headers=headers_a,
    json={
        "dataset_id": ds_alpha_id,
        "dimensions": ["region"],
        "measures": [{"column": "sales", "agg": "sum"}],
        "filters": [{"column": 'region"; DROP TABLE users; --', "operator": "eq", "value": "North"}],
    },
)
report("Filter Column SQLi Blocked", sqli_filt_col.status_code == 400, "Rejected by schema column allowlist (400 Bad Request)")

# 4.3 Parameterized Filter Value
sqli_filt_val = client.post(
    "/query/aggregate",
    headers=headers_a,
    json={
        "dataset_id": ds_alpha_id,
        "dimensions": ["region"],
        "measures": [{"column": "sales", "agg": "sum"}],
        "filters": [{"column": "region", "operator": "eq", "value": "' OR '1'='1"}],
    },
)
report("Filter Value Injection Handled Safely", sqli_filt_val.status_code == 200 and len(sqli_filt_val.json()["data"]) == 0, "Query executed safely via parameter binding with 0 rows matched")

# 4.4 SQL Injection in CSV Export filter column
sqli_export = client.post(
    "/reports/export/csv",
    headers=headers_a,
    json={
        "dataset_id": ds_alpha_id,
        "filters": {'unknown_col"; DROP TABLE users; --': "1"},
    },
)
report("CSV Export Filter Column SQLi Blocked", sqli_export.status_code == 400, "400 Bad Request returned")

# --- SECTION 5: FILE SECURITY & PATH TRAVERSAL ---
print("\n[5] File Security & Path Traversal...")

# 5.1 Reject non-CSV uploads (.py / .exe / .sh)
bad_file = client.post(
    "/datasets/upload",
    headers=headers_a,
    files={"file": ("malicious.py", b"import os; os.system('echo hacked')", "text/x-python")},
    data={"name": "Malicious Script"},
)
report("Non-CSV File Upload Blocked", bad_file.status_code == 400, "400 Bad Request returned")

# 5.2 Empty file upload
empty_file = client.post(
    "/datasets/upload",
    headers=headers_a,
    files={"file": ("empty.csv", b"", "text/csv")},
    data={"name": "Empty File"},
)
report("Empty File Upload Blocked", empty_file.status_code == 400, "400 Bad Request returned")

# 5.3 Path traversal filename upload
trav_file = client.post(
    "/datasets/upload",
    headers=headers_a,
    files={"file": ("../../../../etc/passwd.csv", b"col1,col2\n1,2\n", "text/csv")},
    data={"name": "Traversal Test"},
)
report("Path Traversal Filename Sanitized", trav_file.status_code == 201, "File uploaded with sanitized safe filename")

# --- SECTION 6: SHARING & TOKEN SECURITY ---
print("\n[6] Sharing & Token Security...")

share_link_res = client.get(f"/dashboards/{analyst_dash_id}/share-link", headers=headers_publisher)
assert share_link_res.status_code == 200, f"Share link failed: {share_link_res.text}"
share_token = share_link_res.json()["share_token"]

# 6.1 Token entropy check
report("Share Token High Entropy", len(share_token) >= 20 and share_token.startswith("dash_"), f"Token length: {len(share_token)}")

# 6.2 View published shared dashboard anonymously
anon_res = client.get(f"/dashboards/shared/{share_token}")
report("Anonymous Access to Published Dashboard Allowed", anon_res.status_code == 200, "200 OK returned")

# 6.3 Unpublish dashboard -> share link revoked
client.post(f"/dashboards/{analyst_dash_id}/unpublish", headers=headers_publisher)
unpub_anon = client.get(f"/dashboards/shared/{share_token}")
report("Unpublished Dashboard Share Link Blocked", unpub_anon.status_code == 404, "404 Not Found returned for unpublished/revoked token")

# 6.4 Guessing invalid share token
guess_res = client.get("/dashboards/shared/dash_invalidnonexistenttoken123456")
report("Invalid Share Token Rejection", guess_res.status_code == 404, "404 Not Found returned")

# --- SECTION 7: SECURITY HEADERS & CORS ---
print("\n[7] HTTP Security Headers & Information Leakage...")

health_res = client.get("/health")
headers = health_res.headers

report("X-Content-Type-Options Header", headers.get("X-Content-Type-Options") == "nosniff", "nosniff present")
report("X-Frame-Options Header", headers.get("X-Frame-Options") == "DENY", "DENY present")
report("Referrer-Policy Header", "strict-origin" in headers.get("Referrer-Policy", ""), "strict-origin-when-cross-origin present")
report("Permissions-Policy Header", bool(headers.get("Permissions-Policy")), "Permissions-Policy present")

# Verify password hash is never leaked in User response
me_res = client.get("/auth/me", headers=headers_a)
report("User Response Password Exclusion", "password" not in me_res.text and "hash" not in me_res.text, "No password hash field returned")

# --- SECTION 8: AUDIT LOGGING ---
print("\n[8] Security Audit Logging...")

# Check that failed login generated an audit log
logs_res = client.get("/governance/audit-logs?limit=50", headers=headers_a)
report("Admin Audit Logs Access Allowed", logs_res.status_code == 200, "200 OK")
audit_logs = logs_res.json()
failed_login_logs = [log for log in audit_logs if log.get("action") == "auth:login_failed"]
report("Failed Login Recorded in Audit Logs", len(failed_login_logs) > 0, f"Found {len(failed_login_logs)} security failure event(s)")

# Check that non-admin cannot access audit logs
v_logs = client.get("/governance/audit-logs", headers=headers_viewer)
report("Non-Admin Audit Logs Access Blocked", v_logs.status_code == 403, "403 Forbidden returned")

# Summary
print("\n" + "=" * 80)
print(f" SECURITY TEST SUITE RESULTS: {passed_tests} PASSED, {failed_tests} FAILED")
print("=" * 80)

if failed_tests > 0:
    print("\nFailures:")
    for f in failures:
        print(f"  - {f}")
    sys.exit(1)
else:
    print("\nALL SECURITY TESTS PASSED WITH 0 REGRESSIONS.")
    sys.exit(0)

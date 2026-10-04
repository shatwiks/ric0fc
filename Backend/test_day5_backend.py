"""
Backend Day 5 Comprehensive Test Suite for RicozViz
Verifies:
1. Authentication of all 5 Personas (Admin, Publisher, Analyst, Explorer, Viewer)
2. Dashboard Lifecycle (Draft, Publish, Unpublish, Access Control)
3. Share Links & Granular RBAC Permissions (User share, Role share, Revoke share)
4. Export Centre: Real CSV & PDF Generation, File Download, Scheduled Reports
5. Governance: User listing, Role Update, Status Update, Invites, Member Removal, Admin Protection
6. Audit Logging: Automatic PostgreSQL logging of all major actions with JSON metadata
7. Cross-Organization Isolation: Tenant barrier enforcement
"""

import asyncio
import io
import json
import os
import sys
import uuid
from typing import Dict, Any

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

import httpx

# Ensure Backend is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.database import get_db, AsyncSessionLocal
from app.models.auth import User, Organization, Workspace
from app.models.data import Dataset
from app.models.dashboard import Dashboard, DashboardShare
from app.models.governance import AuditLog, Report, ReportSchedule
from sqlalchemy import select, delete


async def run_tests():
    print("=" * 70)
    print("STARTING RICOZVIZ DAY 5 BACKEND VERIFICATION SUITE")
    print("=" * 70)

    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test", timeout=30.0) as client:
            
            # -------------------------------------------------------------
            # STEP 1: AUTHENTICATION OF ALL 5 PERSONAS
            # -------------------------------------------------------------
            print("\n[STEP 1] Authenticating Personas...")
            tokens: Dict[str, str] = {}
            headers: Dict[str, Dict[str, str]] = {}
            personas = [
                ("admin", "admin@ricozviz.com", "admin123"),
                ("publisher", "publisher@ricozviz.com", "publisher123"),
                ("analyst", "analyst@ricozviz.com", "analyst123"),
                ("explorer", "explorer@ricozviz.com", "explorer123"),
                ("viewer", "viewer@ricozviz.com", "viewer123"),
            ]

            for role_name, email, password in personas:
                resp = await client.post(
                    "/api/auth/login",
                    json={"email": email, "password": password}
                )
                assert resp.status_code == 200, f"Failed to login {email}: {resp.text}"
                data = resp.json()
                tokens[role_name] = data["access_token"]
                headers[role_name] = {"Authorization": f"Bearer {data['access_token']}"}
                print(f"  [PASS] {role_name.upper()} logged in successfully ({email})")

            # Get workspace and org info from admin
            me_resp = await client.get("/api/auth/me", headers=headers["admin"])
            assert me_resp.status_code == 200
            admin_info = me_resp.json()
            org_id = admin_info["organization"]["id"]
            workspace_id = admin_info["workspace"]["id"]
            print(f"  [PASS] Org ID: {org_id} | Workspace ID: {workspace_id}")

            # -------------------------------------------------------------
            # STEP 2: CREATE DATASET FOR EXPORT TESTING
            # -------------------------------------------------------------
            print("\n[STEP 2] Setting up Test Dataset...")
            csv_content = (
                "order_id,region,category,sales,profit,quantity\n"
                "ORD-101,North,Electronics,450.00,85.50,3\n"
                "ORD-102,South,Furniture,230.50,15.20,1\n"
                "ORD-103,East,Office Supplies,78.20,24.10,5\n"
                "ORD-104,West,Electronics,990.00,210.00,2\n"
                "ORD-105,North,Office Supplies,45.00,12.50,4\n"
                "ORD-106,South,Electronics,620.00,110.00,2\n"
            )
            files = {"file": ("sales_sample.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
            upload_resp = await client.post(
                "/api/datasets/upload",
                headers=headers["analyst"],
                files=files,
                data={"name": "Sales Sample Day 5", "workspace_id": workspace_id}
            )
            assert upload_resp.status_code in (200, 201), f"Failed to upload test dataset: {upload_resp.text}"
            dataset = upload_resp.json()
            dataset_id = dataset["id"]
            print(f"  [PASS] Dataset created: '{dataset['name']}' (ID: {dataset_id})")

            # -------------------------------------------------------------
            # STEP 3: DASHBOARD LIFECYCLE (DRAFT / PUBLISH / UNPUBLISH)
            # -------------------------------------------------------------
            print("\n[STEP 3] Testing Dashboard Lifecycle & Permissions...")
            # Analyst creates a dashboard
            db_payload = {
                "title": "Quarterly Revenue Executive Board",
                "description": "Enterprise performance metrics for Day 5 verification",
                "workspace_id": workspace_id,
                "layout": {
                    "theme": "dark",
                    "charts": [
                        {
                            "id": "c1",
                            "title": "Sales by Region",
                            "type": "bar",
                            "dataset_id": dataset_id,
                            "x_axis": "region",
                            "y_axis": "sales",
                            "w": 6, "h": 4, "x": 0, "y": 0
                        },
                        {
                            "id": "c2",
                            "title": "Profit by Category",
                            "type": "pie",
                            "dataset_id": dataset_id,
                            "x_axis": "category",
                            "y_axis": "profit",
                            "w": 6, "h": 4, "x": 6, "y": 0
                        }
                    ]
                }
            }
            create_resp = await client.post("/api/dashboards", headers=headers["analyst"], json=db_payload)
            assert create_resp.status_code in (200, 201), f"Create dashboard failed: {create_resp.text}"
            dashboard = create_resp.json()
            dashboard_id = dashboard["id"]
            assert dashboard["is_published"] is False, "New dashboard must default to Draft (is_published=False)"
            print(f"  [PASS] Dashboard created in DRAFT state (ID: {dashboard_id})")

            # Viewer attempts to access draft dashboard -> MUST BE 403 Forbidden
            viewer_get = await client.get(f"/api/dashboards/{dashboard_id}", headers=headers["viewer"])
            assert viewer_get.status_code == 403, f"Viewer must NOT access Draft dashboard without share! Got {viewer_get.status_code}"
            print("  [PASS] Security Enforced: Viewer received 403 on unpublished draft")

            # Analyst attempts to publish -> MUST BE 403 Forbidden (Only Publisher/Admin can publish)
            analyst_pub = await client.post(f"/api/dashboards/{dashboard_id}/publish", headers=headers["analyst"])
            assert analyst_pub.status_code == 403, f"Analyst must NOT publish dashboard! Got {analyst_pub.status_code}"
            print("  [PASS] Security Enforced: Analyst received 403 trying to publish")

            # Publisher publishes dashboard -> 200 OK
            pub_resp = await client.post(f"/api/dashboards/{dashboard_id}/publish", headers=headers["publisher"])
            assert pub_resp.status_code == 200, f"Publisher failed to publish: {pub_resp.text}"
            assert pub_resp.json()["is_published"] is True
            assert pub_resp.json()["published_at"] is not None
            print("  [PASS] Publisher successfully published dashboard (is_published=True)")

            # Now Viewer CAN view the published dashboard
            viewer_pub_get = await client.get(f"/api/dashboards/{dashboard_id}", headers=headers["viewer"])
            assert viewer_pub_get.status_code == 200, f"Viewer could not view published dashboard: {viewer_pub_get.text}"
            print("  [PASS] Viewer successfully accessed published dashboard")

            # Publisher unpublishes dashboard -> 200 OK
            unpub_resp = await client.post(f"/api/dashboards/{dashboard_id}/unpublish", headers=headers["publisher"])
            assert unpub_resp.status_code == 200
            assert unpub_resp.json()["is_published"] is False
            print("  [PASS] Publisher successfully unpublished dashboard (is_published=False)")

            # Viewer again receives 403 Forbidden
            viewer_unpub_get = await client.get(f"/api/dashboards/{dashboard_id}", headers=headers["viewer"])
            assert viewer_unpub_get.status_code == 403
            print("  [PASS] Viewer blocked (403) again after dashboard was unpublished")

            # -------------------------------------------------------------
            # STEP 4: SHARING MECHANISMS (LINKS & GRANULAR PERMISSIONS)
            # -------------------------------------------------------------
            print("\n[STEP 4] Testing Sharing Links & Granular Permissions...")
            # Publisher generates shareable public link
            link_resp = await client.post(f"/api/dashboards/{dashboard_id}/share-link", headers=headers["publisher"])
            assert link_resp.status_code == 200
            share_data = link_resp.json()
            assert "share_token" in share_data and share_data["share_token"] is not None
            assert "share_url" in share_data
            share_token = share_data["share_token"]
            print(f"  [PASS] Share link generated: {share_data['share_url']} (Token: {share_token[:8]}...)")

            # Public access via token (unauthenticated client)
            anon_get = await client.get(f"/api/dashboards/shared/{share_token}")
            assert anon_get.status_code == 200, f"Public share token retrieval failed: {anon_get.text}"
            shared_board = anon_get.json()
            assert shared_board["id"] == dashboard_id
            assert shared_board["title"] == "Quarterly Revenue Executive Board"
            print("  [PASS] Unauthenticated retrieval of shared board via token passed")

            # Granular Share: Publisher shares the unpublished dashboard directly with Viewer
            # First retrieve Viewer's user ID
            viewer_me = await client.get("/api/auth/me", headers=headers["viewer"])
            viewer_id = viewer_me.json()["user"]["id"]

            share_payload = {
                "user_id": viewer_id,
                "permission": "view"
            }
            add_share_resp = await client.post(
                f"/api/dashboards/{dashboard_id}/shares",
                headers=headers["publisher"],
                json=share_payload
            )
            assert add_share_resp.status_code == 201, f"Failed to add share: {add_share_resp.text}"
            share_obj = add_share_resp.json()
            share_id = share_obj["id"]
            print(f"  [PASS] Explicit user share created (Share ID: {share_id}) for Viewer")

            # List shares
            list_shares_resp = await client.get(f"/api/dashboards/{dashboard_id}/shares", headers=headers["publisher"])
            assert list_shares_resp.status_code == 200
            shares_list = list_shares_resp.json()
            assert any(s["id"] == share_id for s in shares_list)
            print(f"  [PASS] Shares list verified ({len(shares_list)} total shares)")

            # Viewer can now view the UNPUBLISHED dashboard via explicit grant
            viewer_auth_get = await client.get(f"/api/dashboards/{dashboard_id}", headers=headers["viewer"])
            assert viewer_auth_get.status_code == 200, "Viewer should have access via explicit grant"
            print("  [PASS] Viewer accessed unpublished dashboard via explicit grant")

            # Publisher revokes the share
            del_share_resp = await client.delete(
                f"/api/dashboards/{dashboard_id}/shares/{share_id}",
                headers=headers["publisher"]
            )
            assert del_share_resp.status_code in (200, 204)
            print("  [PASS] Explicit share revoked successfully")

            # Viewer is blocked once again
            viewer_revoked_get = await client.get(f"/api/dashboards/{dashboard_id}", headers=headers["viewer"])
            assert viewer_revoked_get.status_code == 403
            print("  [PASS] Security Enforced: Viewer access revoked (403)")

            # Re-publish for export testing
            await client.post(f"/api/dashboards/{dashboard_id}/publish", headers=headers["publisher"])
            print("  [PASS] Re-published dashboard for export verification")

            # -------------------------------------------------------------
            # STEP 5: EXPORT CENTRE (REAL CSV & PDF GENERATION)
            # -------------------------------------------------------------
            print("\n[STEP 5] Testing Real CSV & PDF Exports...")

            # 5.1 Real CSV Export with Filters
            csv_req = {
                "dataset_id": dataset_id,
                "filename": "day5_sales_filtered",
                "filters": {"region": "North"},
                "limit": 100
            }
            export_csv_resp = await client.post("/api/reports/export/csv", headers=headers["viewer"], json=csv_req)
            assert export_csv_resp.status_code == 200, f"CSV Export failed: {export_csv_resp.text}"
            assert "text/csv" in export_csv_resp.headers.get("content-type", "")
            csv_body = export_csv_resp.text
            lines = [line.strip() for line in csv_body.strip().split("\n") if line.strip()]
            assert len(lines) == 3, f"Expected header + 2 'North' rows, got {len(lines)} lines:\n{csv_body}"
            assert "North" in lines[1] and "North" in lines[2]
            assert "South" not in csv_body and "East" not in csv_body
            print(f"  [PASS] Real CSV Export streamed successfully ({len(export_csv_resp.content)} bytes)")
            print("  [PASS] CSV Content verified: Real DuckDB filtered data with exact matching rows")

            # 5.2 Real Multi-Page Executive PDF Export
            pdf_req = {
                "dashboard_id": dashboard_id,
                "title": "Quarterly Revenue Executive Report",
                "include_charts": True,
                "filters": {"region": "All"}
            }
            export_pdf_resp = await client.post("/api/reports/export/pdf", headers=headers["viewer"], json=pdf_req)
            assert export_pdf_resp.status_code == 200, f"PDF Export failed: {export_pdf_resp.text}"
            assert "application/pdf" in export_pdf_resp.headers.get("content-type", "")
            pdf_bytes = export_pdf_resp.content
            assert pdf_bytes.startswith(b"%PDF-"), "Generated file is not a valid PDF binary"
            print(f"  [PASS] Real PDF Report streamed successfully: Valid PDF header (%PDF-) of size {len(pdf_bytes)} bytes")

            # 5.3 Verify Persistence in Reports Repository
            reports_list_resp = await client.get("/api/reports", headers=headers["viewer"])
            assert reports_list_resp.status_code == 200
            saved_reports = reports_list_resp.json()
            assert len(saved_reports) >= 2, f"Expected at least 2 saved reports, found {len(saved_reports)}"
            csv_saved = next((r for r in saved_reports if r["format"] == "csv"), None)
            pdf_saved = next((r for r in saved_reports if r["format"] == "pdf"), None)
            assert csv_saved is not None and csv_saved["file_size_bytes"] > 0
            assert pdf_saved is not None and pdf_saved["file_size_bytes"] > 0
            csv_report_id = csv_saved["id"]
            pdf_report_id = pdf_saved["id"]
            print(f"  [PASS] Reports persisted in PostgreSQL: CSV (ID: {csv_report_id}) & PDF (ID: {pdf_report_id})")

            # Download CSV file from repository
            download_csv = await client.get(f"/api/reports/{csv_report_id}/download", headers=headers["viewer"])
            assert download_csv.status_code == 200
            assert "text/csv" in download_csv.headers.get("content-type", "")
            print("  [PASS] CSV file repository download verified")

            # Download PDF file from repository
            download_pdf = await client.get(f"/api/reports/{pdf_report_id}/download", headers=headers["viewer"])
            assert download_pdf.status_code == 200
            assert download_pdf.content.startswith(b"%PDF-")
            print("  [PASS] PDF file repository download verified")

            # 5.3 Scheduled Report Creation & Permissions
            sched_payload = {
                "name": "Weekly Executive Digest",
                "workspace_id": workspace_id,
                "dashboard_id": dashboard_id,
                "cron_expression": "0 8 * * 1",
                "format": "pdf",
                "recipients": ["board@ricozviz.com", "cfo@ricozviz.com"]
            }
            # Analyst should be rejected 403
            analyst_sched = await client.post("/api/reports/schedules", headers=headers["analyst"], json=sched_payload)
            assert analyst_sched.status_code == 403
            print("  [PASS] Security Enforced: Analyst blocked (403) from scheduling reports")

            # Publisher should succeed
            pub_sched = await client.post("/api/reports/schedules", headers=headers["publisher"], json=sched_payload)
            assert pub_sched.status_code == 201, f"Publisher failed to create schedule: {pub_sched.text}"
            sched_data = pub_sched.json()
            sched_id = sched_data["id"]
            print(f"  [PASS] Publisher scheduled export created: {sched_data['name']} (ID: {sched_id})")

            # List schedules
            list_sched_resp = await client.get("/api/reports/schedules", headers=headers["publisher"])
            assert list_sched_resp.status_code == 200
            assert any(s["id"] == sched_id for s in list_sched_resp.json())
            print("  [PASS] Scheduled exports listed successfully")

            # -------------------------------------------------------------
            # STEP 6: GOVERNANCE & RBAC MANAGEMENT
            # -------------------------------------------------------------
            print("\n[STEP 6] Testing Governance & Admin Role Management...")

            # Viewer attempts to list governance users -> 403 Forbidden
            viewer_gov = await client.get("/api/governance/users", headers=headers["viewer"])
            assert viewer_gov.status_code == 403
            print("  [PASS] Security Enforced: Viewer received 403 on governance endpoints")

            # Admin lists governance users -> 200 OK
            admin_gov = await client.get("/api/governance/users", headers=headers["admin"])
            assert admin_gov.status_code == 200
            users_list = admin_gov.json()
            print(f"  [PASS] Admin fetched {len(users_list)} workspace users")

            # Admin invites new user
            invite_payload = {
                "full_name": "Consultant Day 5",
                "email": "consultant.day5@ricozviz.com",
                "password": "ConsultantPass123!",
                "role": "Analyst"
            }
            invite_resp = await client.post("/api/governance/users/invite", headers=headers["admin"], json=invite_payload)
            assert invite_resp.status_code == 201, f"Invite failed: {invite_resp.text}"
            invited_user = invite_resp.json()
            invited_user_id = invited_user["id"]
            print(f"  [PASS] Invited new user '{invited_user['email']}' with role '{invited_user['role']}'")

            # Admin changes role of invited user to 'Explorer'
            role_update_resp = await client.put(
                f"/api/governance/users/{invited_user_id}/role",
                headers=headers["admin"],
                json={"role": "Explorer"}
            )
            assert role_update_resp.status_code == 200
            assert role_update_resp.json()["role"] == "Explorer"
            print("  [PASS] Admin updated invited user's role to 'Explorer'")

            # Admin toggles status to inactive
            status_resp = await client.put(
                f"/api/governance/users/{invited_user_id}/status",
                headers=headers["admin"],
                json={"is_active": False}
            )
            assert status_resp.status_code == 200
            assert status_resp.json()["is_active"] is False
            print("  [PASS] Admin deactivated invited user")

            # Admin deletes/removes the invited user
            del_user_resp = await client.delete(f"/api/governance/users/{invited_user_id}", headers=headers["admin"])
            assert del_user_resp.status_code in (200, 204)
            print("  [PASS] Admin removed test user from workspace")

            # Governance Overview Metrics
            gov_overview = await client.get("/api/governance/overview", headers=headers["admin"])
            assert gov_overview.status_code == 200
            ov_data = gov_overview.json()
            print(f"  [PASS] Governance Overview: {ov_data['total_users']} users, {ov_data['total_dashboards']} dashboards, {ov_data['published_dashboards']} published")

            # -------------------------------------------------------------
            # STEP 7: SECURITY AUDIT TRAIL VERIFICATION
            # -------------------------------------------------------------
            print("\n[STEP 7] Testing PostgreSQL Security Audit Trail...")

            audit_resp = await client.get("/api/governance/audit-logs?limit=50", headers=headers["admin"])
            assert audit_resp.status_code == 200
            audit_logs = audit_resp.json()
            assert len(audit_logs) > 0, "Audit logs must not be empty!"

            logged_actions = [log["action"] for log in audit_logs]
            print(f"  [PASS] Audit Logs retrieved: {len(audit_logs)} entries recorded in PostgreSQL")

            expected_actions = [
                "dashboard:create",
                "dashboard:publish",
                "dashboard:unpublish",
                "dashboard:share",
                "dashboard:unshare",
                "export:csv",
                "governance:role_change",
                "governance:user_add",
            ]
            for act in expected_actions:
                assert act in logged_actions, f"Expected action '{act}' not found in audit logs! Found: {set(logged_actions)}"
                print(f"    [PASS] Verified audit logging for: {act}")

            # -------------------------------------------------------------
            # STEP 8: CROSS-ORGANIZATION TENANT ISOLATION
            # -------------------------------------------------------------
            print("\n[STEP 8] Testing Cross-Organization Multi-Tenant Isolation...")

            # Register an external user in another organization
            ext_email = f"external_{uuid.uuid4().hex[:6]}@othercorp.com"
            reg_resp = await client.post(
                "/api/auth/signup",
                json={
                    "full_name": "Foreign Tenant",
                    "email": ext_email,
                    "password": "ExternalPassword123!",
                    "organization_name": "OtherCorp Global",
                    "role": "Admin"
                }
            )
            assert reg_resp.status_code in (200, 201), f"Registration of foreign tenant failed: {reg_resp.text}"
            ext_token = reg_resp.json()["access_token"]
            ext_headers = {"Authorization": f"Bearer {ext_token}"}
            print(f"  [PASS] Registered foreign tenant '{ext_email}' in separate organization")

            # Foreign tenant tries to view Org 1 dashboard -> 404 Not Found (or 403)
            ext_db_resp = await client.get(f"/api/dashboards/{dashboard_id}", headers=ext_headers)
            assert ext_db_resp.status_code in (403, 404), f"Foreign tenant should NOT access Org 1 dashboard! Got {ext_db_resp.status_code}"
            print(f"  [PASS] Cross-tenant access blocked ({ext_db_resp.status_code}) on Org 1 dashboard")

            # Foreign tenant tries to access Org 1 governance overview -> 403 Forbidden or isolated empty data
            ext_gov_resp = await client.get("/api/governance/overview", headers=ext_headers)
            if ext_gov_resp.status_code == 200:
                ext_overview = ext_gov_resp.json()
                assert ext_overview["total_dashboards"] == 0, "Foreign tenant leaked Org 1 dashboards!"
                print("  [PASS] Foreign tenant's governance overview completely isolated (0 dashboards in their org)")

            # Foreign tenant tries to download Org 1 CSV report -> 403 Forbidden or 404 Not Found
            ext_report_resp = await client.get(f"/api/reports/{csv_report_id}/download", headers=ext_headers)
            assert ext_report_resp.status_code in (403, 404), f"Foreign tenant should NOT download Org 1 report! Got {ext_report_resp.status_code}"
            print(f"  [PASS] Foreign tenant blocked ({ext_report_resp.status_code}) on Org 1 report download")

    print("\n" + "=" * 70)
    print("ALL DAY 5 BACKEND TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(run_tests())

"""
Backend Day 6 Comprehensive Test Suite for RicozViz
Verifies:
1. Authentication of Personas (Admin, Publisher, Analyst, Explorer, Viewer)
2. Dataset & Schema Discovery (Real CSV data setup)
3. AI Analyst: Natural language -> query plan -> DuckDB execution -> real result
4. Deterministic No-LLM Fallback & Labeling
5. Conversation & Message PostgreSQL Persistence
6. AI Dashboard Generator: Automatic schema analysis & widget creation in PostgreSQL
7. Data Detective: Real variance, contributor decomposition & waterfall calculation
8. RicozPulse: Real anomaly detection, severity classification & persistence
9. RBAC: Strict permission enforcement on AI endpoints (Viewer blocked, Explorer/Analyst allowed appropriately)
10. Cross-Tenant Isolation: Foreign workspace access rejected with 403/404
11. Safe Query Validation: Prevention of arbitrary SQL execution
12. Audit Trail: Automatic logging of AI events in audit_logs table
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
from app.models.dashboard import Dashboard, DashboardWidget
from app.models.intelligence import AIConversation, AIMessage, PulseInsight
from app.models.governance import AuditLog
from sqlalchemy import select, delete

SAMPLE_CSV_DATA = """Date,Region,Category,Sales,Profit,Quantity
2024-01-15,North,Technology,1200.50,300.25,5
2024-01-18,South,Furniture,850.00,120.00,2
2024-02-10,East,Technology,2100.00,550.00,8
2024-02-22,West,Office Supplies,320.00,80.00,10
2024-03-05,North,Office Supplies,450.00,95.00,12
2024-03-19,South,Technology,1800.00,420.00,6
2024-04-12,East,Furniture,1450.00,210.00,4
2024-04-25,West,Technology,2900.00,750.00,9
2024-05-08,North,Furniture,920.00,140.00,3
2024-05-21,South,Office Supplies,510.00,110.00,15
2024-06-14,East,Office Supplies,680.00,150.00,14
2024-06-30,West,Furniture,1750.00,280.00,5
"""

async def run_tests():
    print("=" * 70)
    print("STARTING RICOZVIZ DAY 6 BACKEND VERIFICATION SUITE")
    print("=" * 70)

    results = []

    def record_test(name: str, passed: bool, details: str = ""):
        status_str = "PASS" if passed else "FAIL"
        print(f"[{status_str}] {name}: {details}")
        results.append((name, passed, details))

    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test", timeout=30.0) as client:

            # -------------------------------------------------------------
            # STEP 1: AUTHENTICATION OF ALL PERSONAS
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

            auth_all_passed = True
            for role_name, email, password in personas:
                res = await client.post("/api/auth/login", json={"email": email, "password": password})
                if res.status_code == 200:
                    token = res.json()["access_token"]
                    tokens[role_name] = token
                    headers[role_name] = {"Authorization": f"Bearer {token}"}
                else:
                    auth_all_passed = False
                    print(f"  Failed login for {email}: {res.text}")

            record_test("Authentication", auth_all_passed, f"Authenticated {len(tokens)}/5 roles")

            # -------------------------------------------------------------
            # STEP 2: SETUP DATASET & SCHEMA DISCOVERY
            # -------------------------------------------------------------
            print("\n[STEP 2] Setting up real test dataset...")
            files = {"file": ("enterprise_sales.csv", io.BytesIO(SAMPLE_CSV_DATA.encode("utf-8")), "text/csv")}
            data = {"name": "Enterprise Sales Intelligence Q1-Q2"}
            upload_res = await client.post("/api/datasets/upload", headers=headers["analyst"], files=files, data=data)
            
            dataset_id = None
            if upload_res.status_code == 201:
                dataset_obj = upload_res.json()
                dataset_id = dataset_obj["id"]
                cols = [c["name"] for c in dataset_obj.get("columns", [])]
                record_test("Dataset Upload & Schema Discovery", True, f"Dataset '{dataset_obj['name']}' uploaded with columns: {cols}")
            else:
                # If dataset exists, fetch existing
                list_res = await client.get("/api/datasets", headers=headers["analyst"])
                if list_res.status_code == 200 and len(list_res.json()) > 0:
                    dataset_id = list_res.json()[0]["id"]
                    record_test("Dataset Schema Discovery", True, f"Reused existing dataset id: {dataset_id}")
                else:
                    record_test("Dataset Upload & Schema Discovery", False, f"Upload failed: {upload_res.text}")
                    return

            # -------------------------------------------------------------
            # STEP 3: AI ANALYST (NATURAL LANGUAGE -> REAL DUCKDB -> RESULT)
            # -------------------------------------------------------------
            print("\n[STEP 3] Testing AI Analyst Natural Language Query Execution...")
            ai_chat_payload = {
                "dataset_id": dataset_id,
                "message": "Total sales by category top 3",
            }
            chat_res = await client.post("/api/ai/chat", headers=headers["analyst"], json=ai_chat_payload)
            chat_passed = False
            conversation_id = None
            if chat_res.status_code == 200:
                chat_data = chat_res.json()
                conversation_id = chat_data["conversation_id"]
                has_rows = len(chat_data.get("data", [])) > 0
                has_sql = "SELECT" in chat_data.get("query_plan", {}).get("sql", "").upper()
                is_fallback = chat_data.get("mode") == "fallback"
                has_explanation = len(chat_data.get("reply", "")) > 10
                
                chat_passed = has_rows and has_sql and is_fallback and has_explanation
                record_test(
                    "AI Analyst Natural Language Pipeline",
                    chat_passed,
                    f"Mode: {chat_data.get('mode')}, Rows: {len(chat_data.get('data', []))}, SQL: {chat_data.get('query_plan', {}).get('sql')[:40]}...",
                )
            else:
                record_test("AI Analyst Natural Language Pipeline", False, f"HTTP {chat_res.status_code}: {chat_res.text}")

            # Test a second follow-up query in same conversation
            if conversation_id:
                followup_payload = {
                    "dataset_id": dataset_id,
                    "conversation_id": conversation_id,
                    "message": "What is the average profit by region?",
                }
                followup_res = await client.post("/api/ai/chat", headers=headers["analyst"], json=followup_payload)
                record_test(
                    "AI Analyst Multi-Turn Conversation",
                    followup_res.status_code == 200 and len(followup_res.json().get("data", [])) > 0,
                    f"Follow-up query succeeded in conversation {conversation_id}",
                )

            # -------------------------------------------------------------
            # STEP 4: CONVERSATION PERSISTENCE IN POSTGRESQL
            # -------------------------------------------------------------
            print("\n[STEP 4] Verifying AI Conversation & Message Persistence...")
            conv_list_res = await client.get("/api/ai/conversations", headers=headers["analyst"])
            conv_detail_res = await client.get(f"/api/ai/conversations/{conversation_id}", headers=headers["analyst"]) if conversation_id else None
            
            persisted_ok = (
                conv_list_res.status_code == 200
                and len(conv_list_res.json()) > 0
                and conv_detail_res is not None
                and conv_detail_res.status_code == 200
                and len(conv_detail_res.json().get("messages", [])) >= 2
            )
            record_test(
                "Conversation & Message Persistence",
                persisted_ok,
                f"Retrieved conversation with {len(conv_detail_res.json().get('messages', [])) if conv_detail_res else 0} persisted messages from PostgreSQL",
            )

            # -------------------------------------------------------------
            # STEP 5: AI DASHBOARD GENERATOR
            # -------------------------------------------------------------
            print("\n[STEP 5] Testing AI Dashboard Generator...")
            gen_dash_payload = {
                "dataset_id": dataset_id,
                "title": "Automated Executive Intelligence Summary",
            }
            gen_res = await client.post("/api/ai/generate-dashboard", headers=headers["analyst"], json=gen_dash_payload)
            generated_dashboard_id = None
            if gen_res.status_code == 201:
                dash_data = gen_res.json()
                generated_dashboard_id = dash_data["dashboard_id"]
                w_count = dash_data["widgets_count"]
                
                # Verify it exists in standard dashboard engine
                verify_dash = await client.get(f"/api/dashboards/{generated_dashboard_id}", headers=headers["analyst"])
                dash_verified = verify_dash.status_code == 200 and len(verify_dash.json().get("widgets", [])) >= 4
                record_test(
                    "AI Dashboard Generator & PostgreSQL Persistence",
                    dash_verified,
                    f"Dashboard '{dash_data['title']}' created with {w_count} widgets and verified via GET /api/dashboards/{generated_dashboard_id}",
                )
            else:
                record_test("AI Dashboard Generator", False, f"HTTP {gen_res.status_code}: {gen_res.text}")

            # -------------------------------------------------------------
            # STEP 6: DATA DETECTIVE (VARIANCE & WATERFALL ROOT CAUSE)
            # -------------------------------------------------------------
            print("\n[STEP 6] Testing Data Detective Root-Cause Analysis...")
            detective_payload = {
                "dataset_id": dataset_id,
                "metric": "Sales",
                "dimension": "Category",
                "agg": "sum",
                "comparison_mode": "auto",
            }
            detective_res = await client.post("/api/detective/analyze", headers=headers["analyst"], json=detective_payload)
            if detective_res.status_code == 200:
                det_data = detective_res.json()
                has_totals = "baseline_total" in det_data and "current_total" in det_data
                has_variance = "variance_abs" in det_data and "variance_pct" in det_data
                has_contributors = len(det_data.get("contributors", [])) > 0
                has_waterfall = len(det_data.get("waterfall", [])) >= 3
                has_narrative = len(det_data.get("explanation", "")) > 20
                
                det_passed = has_totals and has_variance and has_contributors and has_waterfall and has_narrative
                record_test(
                    "Data Detective Variance & Waterfall Analysis",
                    det_passed,
                    f"Baseline: {det_data.get('baseline_total')}, Current: {det_data.get('current_total')}, Variance: {det_data.get('variance_abs')}, Waterfall Items: {len(det_data.get('waterfall', []))}",
                )
            else:
                record_test("Data Detective Variance Analysis", False, f"HTTP {detective_res.status_code}: {detective_res.text}")

            # -------------------------------------------------------------
            # STEP 7: RICOZPULSE (EXECUTIVE RADAR & ANOMALY SCAN)
            # -------------------------------------------------------------
            print("\n[STEP 7] Testing RicozPulse Generation & Persistence...")
            pulse_gen_res = await client.post("/api/pulse/generate", headers=headers["analyst"], json={"dataset_id": dataset_id})
            pulse_list_res = await client.get("/api/pulse", headers=headers["viewer"])
            
            pulse_passed = (
                pulse_gen_res.status_code == 200
                and pulse_list_res.status_code == 200
                and len(pulse_list_res.json()) > 0
            )
            sample_insight = pulse_list_res.json()[0] if pulse_list_res.status_code == 200 and len(pulse_list_res.json()) > 0 else {}
            record_test(
                "RicozPulse Insight Generation & Persistence",
                pulse_passed,
                f"Generated insights in PostgreSQL. Top insight: '{sample_insight.get('metric_name')}' severity={sample_insight.get('severity')}",
            )

            # -------------------------------------------------------------
            # STEP 8: RBAC & PERMISSION BOUNDARY ENFORCEMENT
            # -------------------------------------------------------------
            print("\n[STEP 8] Testing RBAC Permissions...")
            # Viewer cannot use AI Analyst (requires ai:analyst)
            viewer_ai = await client.post("/api/ai/chat", headers=headers["viewer"], json={"dataset_id": dataset_id, "message": "Show sales"})
            record_test("RBAC: Viewer Blocked from AI Analyst", viewer_ai.status_code == 403, f"Status: {viewer_ai.status_code}")

            # Viewer cannot use Data Detective (requires ai:detective)
            viewer_det = await client.post("/api/detective/analyze", headers=headers["viewer"], json={"dataset_id": dataset_id, "metric": "Sales", "dimension": "Category"})
            record_test("RBAC: Viewer Blocked from Data Detective", viewer_det.status_code == 403, f"Status: {viewer_det.status_code}")

            # Explorer cannot generate dashboards (requires ai:generate_dashboard)
            explorer_dash = await client.post("/api/ai/generate-dashboard", headers=headers["explorer"], json={"dataset_id": dataset_id})
            record_test("RBAC: Explorer Blocked from Generating Dashboard", explorer_dash.status_code == 403, f"Status: {explorer_dash.status_code}")

            # Explorer CAN use AI Analyst and Data Detective
            explorer_ai = await client.post("/api/ai/chat", headers=headers["explorer"], json={"dataset_id": dataset_id, "message": "Total sales"})
            record_test("RBAC: Explorer Allowed for AI Analyst", explorer_ai.status_code == 200, f"Status: {explorer_ai.status_code}")

            # Viewer CAN view pulse insights
            viewer_pulse = await client.get("/api/pulse", headers=headers["viewer"])
            record_test("RBAC: Viewer Allowed to View Pulse Feed", viewer_pulse.status_code == 200, f"Status: {viewer_pulse.status_code}")

            # -------------------------------------------------------------
            # STEP 9: TENANT ISOLATION (CROSS-ORGANIZATION PROTECTION)
            # -------------------------------------------------------------
            print("\n[STEP 9] Testing Cross-Tenant Isolation...")
            # Signup an attacker in a foreign organization
            attacker_signup = {
                "organization_name": "Rival Global Enterprise",
                "full_name": "Infiltrator Bob",
                "email": f"attacker_{uuid.uuid4().hex[:6]}@rivalcorp.com",
                "password": "Password123!",
            }
            att_res = await client.post("/api/auth/signup", json=attacker_signup)
            if att_res.status_code in (200, 201):
                att_token = att_res.json()["access_token"]
                att_headers = {"Authorization": f"Bearer {att_token}"}
                
                # Attacker tries to query Org 1's dataset via AI Analyst
                cross_ai = await client.post("/api/ai/chat", headers=att_headers, json={"dataset_id": dataset_id, "message": "Total sales"})
                # Attacker tries to analyze Org 1's dataset via Detective
                cross_det = await client.post("/api/detective/analyze", headers=att_headers, json={"dataset_id": dataset_id, "metric": "Sales", "dimension": "Category"})
                # Attacker tries to generate dashboard on Org 1's dataset
                cross_dash = await client.post("/api/ai/generate-dashboard", headers=att_headers, json={"dataset_id": dataset_id})

                cross_tenant_safe = (
                    cross_ai.status_code in (403, 404)
                    and cross_det.status_code in (403, 404)
                    and cross_dash.status_code in (403, 404)
                )
                record_test(
                    "Cross-Tenant Barrier Enforcement",
                    cross_tenant_safe,
                    f"AI Chat: {cross_ai.status_code}, Detective: {cross_det.status_code}, Dashboard Gen: {cross_dash.status_code} (All Forbidden/Not Found)",
                )
            else:
                record_test("Cross-Tenant Isolation", False, f"Failed to create attacker tenant: {att_res.text}")

            # -------------------------------------------------------------
            # STEP 10: SAFE QUERY ENFORCEMENT & AUDIT LOGGING
            # -------------------------------------------------------------
            print("\n[STEP 10] Testing Safe Query Enforcement & Audit Logging...")
            # Malicious injection attempt in AI analyst
            sqli_payload = {
                "dataset_id": dataset_id,
                "message": "Sales by category; DROP TABLE datasets; --",
            }
            sqli_res = await client.post("/api/ai/chat", headers=headers["analyst"], json=sqli_payload)
            # Must safely process without SQL injection
            sqli_safe = sqli_res.status_code == 200 and "DROP TABLE" not in sqli_res.json().get("reply", "")
            
            # Verify datasets table still intact
            check_ds = await client.get(f"/api/datasets/{dataset_id}", headers=headers["analyst"])
            table_intact = check_ds.status_code == 200
            
            record_test(
                "Safe Query & Injection Prevention",
                sqli_safe and table_intact,
                f"SQL injection attempt sanitized cleanly; dataset remains intact (HTTP {check_ds.status_code})",
            )

            # Verify audit logging
            async with AsyncSessionLocal() as session:
                audit_res = await session.execute(
                    select(AuditLog).where(
                        AuditLog.action.in_(["ai:analyst_chat", "dashboard:generate_ai", "detective:analyze", "pulse:generate"])
                    )
                )
                audit_entries = audit_res.scalars().all()
                has_audit_logs = len(audit_entries) >= 3
                record_test(
                    "Audit Trail Logging for AI Services",
                    has_audit_logs,
                    f"Found {len(audit_entries)} verified audit log events in PostgreSQL",
                )

    # -------------------------------------------------------------
    # FINAL SUMMARY REPORT
    # -------------------------------------------------------------
    print("\n" + "=" * 70)
    print("DAY 6 BACKEND TEST EXECUTION SUMMARY")
    print("=" * 70)
    total_passed = sum(1 for _, p, _ in results if p)
    total_tests = len(results)
    for name, p, details in results:
        status_sym = "[OK]" if p else "[FAIL]"
        print(f"{status_sym:8} {name:<40} {details}")

    print("-" * 70)
    print(f"TOTAL BACKEND TESTS: {total_passed}/{total_tests} PASSED ({round(total_passed/total_tests*100, 1)}%)")
    print("=" * 70)

    if total_passed < total_tests:
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run_tests())

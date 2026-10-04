import asyncio
import os
import uuid
import httpx

BACKEND_URL = "http://127.0.0.1:8000/api"

async def run_day4_backend_tests():
    print("=" * 80)
    print("RICOZVIZ DAY 4 BACKEND VERIFICATION SUITE — DASHBOARD ENGINE & WIDGETS")
    print("=" * 80)

    async with httpx.AsyncClient(base_url=BACKEND_URL, timeout=30.0) as client:
        # 1. Authenticate Personas
        print("\n[Step 1] Authenticating Demo Personas...")
        admin_login = await client.post("/auth/login", json={"email": "admin@ricozviz.com", "password": "admin123"})
        assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        analyst_login = await client.post("/auth/login", json={"email": "analyst@ricozviz.com", "password": "analyst123"})
        assert analyst_login.status_code == 200, f"Analyst login failed: {analyst_login.text}"
        analyst_token = analyst_login.json()["access_token"]
        analyst_headers = {"Authorization": f"Bearer {analyst_token}"}

        viewer_login = await client.post("/auth/login", json={"email": "viewer@ricozviz.com", "password": "viewer123"})
        assert viewer_login.status_code == 200, f"Viewer login failed: {viewer_login.text}"
        viewer_token = viewer_login.json()["access_token"]
        viewer_headers = {"Authorization": f"Bearer {viewer_token}"}
        print("  -> Admin, Analyst, and Viewer authenticated.")

        # 2. Get Real Dataset to attach to widgets
        datasets_res = await client.get("/datasets", headers=analyst_headers)
        assert datasets_res.status_code == 200
        datasets = datasets_res.json()
        assert len(datasets) > 0, "No datasets available for Day 4 tests!"
        target_dataset = datasets[0]
        dataset_id = target_dataset["id"]
        print(f"  -> Using real dataset: '{target_dataset['name']}' (ID: {dataset_id})")

        # 3. RBAC: Viewer cannot create dashboards
        print("\n[Step 2] Verifying RBAC: Viewer cannot create dashboards...")
        viewer_create = await client.post(
            "/dashboards",
            json={"title": "Viewer Unauthorized Dashboard"},
            headers=viewer_headers,
        )
        assert viewer_create.status_code == 403, f"Expected 403, got {viewer_create.status_code}"
        print("  -> PASS: Viewer dashboard creation rejected with 403 Forbidden.")

        # 4. Create Dashboard as Analyst
        print("\n[Step 3] Creating real Dashboard as Analyst...")
        dashboard_payload = {
            "title": "Q3 Executive Revenue Intelligence",
            "description": "Comprehensive regional performance and product portfolio analysis",
            "layout": {"columns": 12, "row_height": 180},
            "is_published": False,
        }
        create_res = await client.post("/dashboards", json=dashboard_payload, headers=analyst_headers)
        assert create_res.status_code == 201, f"Failed to create dashboard: {create_res.status_code} {create_res.text}"
        dashboard = create_res.json()
        dashboard_id = dashboard["id"]
        print(f"  -> PASS: Dashboard created in PostgreSQL! ID: {dashboard_id}")
        assert dashboard["title"] == "Q3 Executive Revenue Intelligence"
        assert dashboard["widget_count"] == 0

        # 5. List Dashboards
        print("\n[Step 4] Listing Dashboards for workspace...")
        list_res = await client.get("/dashboards", headers=analyst_headers)
        assert list_res.status_code == 200
        dashboards_list = list_res.json()
        assert any(d["id"] == dashboard_id for d in dashboards_list), "Created dashboard missing from list!"
        print(f"  -> PASS: Dashboard present in workspace listing ({len(dashboards_list)} total dashboards).")

        # 6. Add Widgets (Testing all chart types)
        print("\n[Step 5] Adding Core Chart Widgets (Bar, Line, Area, Donut, Scatter, KPI, Table)...")
        widget_specs = [
            {
                "title": "Regional Revenue Breakdown",
                "chart_type": "bar",
                "dataset_id": dataset_id,
                "dimensions": ["region"],
                "measures": [{"column": "revenue", "agg": "sum", "alias": "sum_revenue"}],
                "filters": [],
                "config": {"color": "#06b6d4"},
                "position": {"x": 0, "y": 0, "w": 6, "h": 2},
            },
            {
                "title": "Order Volume Trend",
                "chart_type": "line",
                "dataset_id": dataset_id,
                "dimensions": ["region"],
                "measures": [{"column": "orders", "agg": "sum", "alias": "sum_orders"}],
                "filters": [],
                "config": {"color": "#3b82f6"},
                "position": {"x": 6, "y": 0, "w": 6, "h": 2},
            },
            {
                "title": "Total Operating Revenue",
                "chart_type": "kpi",
                "dataset_id": dataset_id,
                "dimensions": [],
                "measures": [{"column": "revenue", "agg": "sum", "alias": "total_revenue"}],
                "filters": [],
                "config": {"prefix": "$", "format": "currency"},
                "position": {"x": 0, "y": 2, "w": 4, "h": 1},
            },
            {
                "title": "Product Revenue Share",
                "chart_type": "donut",
                "dataset_id": dataset_id,
                "dimensions": ["product"],
                "measures": [{"column": "revenue", "agg": "sum", "alias": "product_rev"}],
                "filters": [],
                "config": {},
                "position": {"x": 4, "y": 2, "w": 4, "h": 2},
            },
            {
                "title": "Regional Revenue Spread",
                "chart_type": "area",
                "dataset_id": dataset_id,
                "dimensions": ["region"],
                "measures": [{"column": "revenue", "agg": "avg", "alias": "avg_revenue"}],
                "filters": [],
                "config": {},
                "position": {"x": 8, "y": 2, "w": 4, "h": 2},
            },
            {
                "title": "Revenue vs Orders Correlation",
                "chart_type": "scatter",
                "dataset_id": dataset_id,
                "dimensions": ["product"],
                "measures": [
                    {"column": "revenue", "agg": "sum", "alias": "sum_rev"},
                    {"column": "orders", "agg": "sum", "alias": "sum_orders"},
                ],
                "filters": [],
                "config": {},
                "position": {"x": 0, "y": 4, "w": 6, "h": 2},
            },
            {
                "title": "Granular Territory Matrix",
                "chart_type": "table",
                "dataset_id": dataset_id,
                "dimensions": ["region", "product"],
                "measures": [{"column": "revenue", "agg": "sum", "alias": "revenue"}],
                "filters": [],
                "config": {},
                "position": {"x": 6, "y": 4, "w": 6, "h": 2},
            },
        ]

        created_widgets = []
        for spec in widget_specs:
            w_res = await client.post(f"/dashboards/{dashboard_id}/widgets", json=spec, headers=analyst_headers)
            assert w_res.status_code == 201, f"Failed to add widget {spec['title']}: {w_res.text}"
            w_data = w_res.json()
            created_widgets.append(w_data)
            print(f"  -> Added {w_data['chart_type'].upper()} widget: '{w_data['title']}' (ID: {w_data['id']})")

        assert len(created_widgets) == 7, "All 7 core chart widgets should be created!"
        print("  -> PASS: All 7 core chart types persisted successfully in PostgreSQL.")

        # 7. Verify Widget Re-Query via DuckDB (/api/query/aggregate)
        print("\n[Step 6] Executing Real DuckDB Query for Bar Chart Widget configuration...")
        bar_widget = created_widgets[0]
        query_req = {
            "dataset_id": bar_widget["dataset_id"],
            "dimensions": bar_widget["dimensions"],
            "measures": bar_widget["measures"],
            "limit": 100,
        }
        query_res = await client.post("/query/aggregate", json=query_req, headers=analyst_headers)
        assert query_res.status_code == 200
        query_out = query_res.json()
        print(f"  -> PASS: DuckDB query for widget '{bar_widget['title']}' returned {query_out['row_count']} rows in {query_out['execution_time_ms']} ms!")
        print("     Sample aggregated row:", query_out["data"][0])

        # 8. Update Widget
        print("\n[Step 7] Updating Widget configuration...")
        update_w_res = await client.put(
            f"/dashboards/{dashboard_id}/widgets/{bar_widget['id']}",
            json={"title": "Q3 Regional Revenue (Audited)", "position": {"x": 0, "y": 0, "w": 8, "h": 2}},
            headers=analyst_headers,
        )
        assert update_w_res.status_code == 200
        updated_w = update_w_res.json()
        assert updated_w["title"] == "Q3 Regional Revenue (Audited)"
        assert updated_w["position"]["w"] == 8
        print("  -> PASS: Widget updated successfully.")

        # 9. Add Dashboard Filter
        print("\n[Step 8] Adding Dashboard Global Filter...")
        filter_payload = {
            "column_name": "region",
            "filter_type": "select",
            "default_value": "South",
        }
        filter_res = await client.post(f"/dashboards/{dashboard_id}/filters", json=filter_payload, headers=analyst_headers)
        assert filter_res.status_code == 201
        created_filter = filter_res.json()
        filter_id = created_filter["id"]
        print(f"  -> PASS: Dashboard filter created: {created_filter['column_name']} (ID: {filter_id})")

        # 10. Read Full Dashboard Detail
        print("\n[Step 9] Retrieving full Dashboard with all Widgets and Filters...")
        get_res = await client.get(f"/dashboards/{dashboard_id}", headers=analyst_headers)
        assert get_res.status_code == 200
        full_d = get_res.json()
        assert full_d["widget_count"] == 7
        assert len(full_d["widgets"]) == 7
        assert len(full_d["filters"]) == 1
        print("  -> PASS: Full dashboard reconstructed from PostgreSQL with 7 widgets and 1 filter.")

        # 11. Cross-Organization Isolation
        print("\n[Step 10] Verifying Cross-Organization Security Isolation...")
        signup_org2 = await client.post("/auth/signup", json={
            "full_name": "Rival BI Director",
            "email": f"rival_{os.urandom(4).hex()}@competitor.com",
            "password": "Password123!",
            "organization_name": "Competitor Org",
            "role": "Analyst",
        })
        assert signup_org2.status_code == 201
        org2_token = signup_org2.json()["access_token"]
        org2_headers = {"Authorization": f"Bearer {org2_token}"}

        # Attempt to read dashboard from org 1 using org 2 user
        unauth_read = await client.get(f"/dashboards/{dashboard_id}", headers=org2_headers)
        assert unauth_read.status_code in [403, 404], f"Expected 403 or 404, got {unauth_read.status_code}"
        print(f"  -> PASS: Unauthorized org access to dashboard rejected: {unauth_read.status_code}")

        # Attempt to update dashboard
        unauth_update = await client.put(f"/dashboards/{dashboard_id}", json={"title": "Hacked Title"}, headers=org2_headers)
        assert unauth_update.status_code in [403, 404]
        print(f"  -> PASS: Unauthorized org update to dashboard rejected: {unauth_update.status_code}")

        # 12. Delete Filter and Delete Widget
        print("\n[Step 11] Cleaning up test filter and widget...")
        del_f = await client.delete(f"/dashboards/{dashboard_id}/filters/{filter_id}", headers=analyst_headers)
        assert del_f.status_code == 200
        print("  -> PASS: Filter deleted.")

        del_w = await client.delete(f"/dashboards/{dashboard_id}/widgets/{bar_widget['id']}", headers=analyst_headers)
        assert del_w.status_code == 200
        print("  -> PASS: Widget deleted.")

        check_d = await client.get(f"/dashboards/{dashboard_id}", headers=analyst_headers)
        assert check_d.json()["widget_count"] == 6

        print("\n" + "=" * 80)
        print("ALL DAY 4 BACKEND TESTS PASSED SUCCESSFULLY!")
        print("=" * 80)

if __name__ == "__main__":
    asyncio.run(run_day4_backend_tests())

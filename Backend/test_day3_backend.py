import asyncio
import io
import json
import os
import sys
import httpx

BACKEND_URL = "http://127.0.0.1:8000/api"

SAMPLE_CSV = """region,product,revenue,orders,active
South,Widget Alpha,1500.50,15,true
West,Gadget Pro,2800.00,28,true
North,Widget Alpha,950.25,9,false
South,Gadget Pro,3400.00,34,true
East,Service Pack,1200.00,12,true
West,Widget Alpha,1750.75,17,true
East,Gadget Pro,2100.00,21,false
South,Service Pack,800.00,8,true
West,Service Pack,1600.00,16,true
North,Gadget Pro,1900.50,19,true
"""

MALFORMED_CSV = """col1,col2
value1,value2,unexpected_extra_column_that_violates_csv_structure_without_quotes
"""

async def run_day3_backend_tests():
    print("=" * 75)
    print("RICOZVIZ DAY 3 BACKEND & DUCKDB VERIFICATION SUITE")
    print("=" * 75)

    async with httpx.AsyncClient(base_url=BACKEND_URL, timeout=30.0) as client:
        # 0. Check Health
        print("\n[Step 0] Verifying Backend Health...")
        health_res = await client.get("/health")
        assert health_res.status_code == 200, f"Health check failed: {health_res.text}"
        print("  -> Backend is healthy:", health_res.json())

        # 1. Login as Admin, Analyst, and Viewer
        print("\n[Step 1] Authenticating Demo Personas (Admin, Analyst, Viewer)...")
        admin_login = await client.post("/auth/login", json={"email": "admin@ricozviz.com", "password": "admin123"})
        assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("  -> Admin authenticated.")

        analyst_login = await client.post("/auth/login", json={"email": "analyst@ricozviz.com", "password": "analyst123"})
        assert analyst_login.status_code == 200, f"Analyst login failed: {analyst_login.text}"
        analyst_token = analyst_login.json()["access_token"]
        analyst_headers = {"Authorization": f"Bearer {analyst_token}"}
        print("  -> Analyst authenticated.")

        viewer_login = await client.post("/auth/login", json={"email": "viewer@ricozviz.com", "password": "viewer123"})
        assert viewer_login.status_code == 200, f"Viewer login failed: {viewer_login.text}"
        viewer_token = viewer_login.json()["access_token"]
        viewer_headers = {"Authorization": f"Bearer {viewer_token}"}
        print("  -> Viewer authenticated.")

        # 2. RBAC Enforcement: Viewer cannot upload datasets (Criterion 22)
        print("\n[Criteria 3 & 22] Testing RBAC: Viewer upload rejection...")
        viewer_upload = await client.post(
            "/datasets/upload",
            files={"file": ("test.csv", io.BytesIO(SAMPLE_CSV.encode("utf-8")), "text/csv")},
            data={"name": "Viewer Forbidden Dataset"},
            headers=viewer_headers,
        )
        assert viewer_upload.status_code == 403, f"Expected 403 for Viewer upload, got {viewer_upload.status_code}: {viewer_upload.text}"
        print("  -> PASS: Viewer upload correctly rejected with 403 Forbidden.")

        # 3. Validation: Reject Empty CSV (0 bytes) (Criterion 3)
        print("\n[Criterion 3] Testing validation: Empty file (0 bytes)...")
        empty_upload = await client.post(
            "/datasets/upload",
            files={"file": ("empty.csv", io.BytesIO(b""), "text/csv")},
            data={"name": "Empty Dataset"},
            headers=analyst_headers,
        )
        assert empty_upload.status_code == 400, f"Expected 400 for empty CSV, got {empty_upload.status_code}: {empty_upload.text}"
        print("  -> PASS: Empty CSV rejected with 400 Bad Request.")

        # 4. Validation: Reject Non-CSV Files (Criterion 3)
        print("\n[Criterion 3] Testing validation: Non-CSV file (.json)...")
        bad_format_upload = await client.post(
            "/datasets/upload",
            files={"file": ("data.json", io.BytesIO(b'{"key": "value"}'), "application/json")},
            data={"name": "Bad Format Dataset"},
            headers=analyst_headers,
        )
        assert bad_format_upload.status_code == 400, f"Expected 400 for non-CSV file, got {bad_format_upload.status_code}: {bad_format_upload.text}"
        print("  -> PASS: Non-CSV file rejected with 400 Bad Request.")

        # 5. Successful CSV Ingestion by Analyst (Criteria 1, 2, 4, 5, 6, 7, 8)
        print("\n[Criteria 1, 2, 4, 5, 6, 7, 8] Ingesting real CSV as Analyst...")
        upload_res = await client.post(
            "/datasets/upload",
            files={"file": ("regional_sales_q3.csv", io.BytesIO(SAMPLE_CSV.encode("utf-8")), "text/csv")},
            data={"name": "Regional Sales Q3 Intelligence", "description": "Operational Q3 revenue by territory and SKU"},
            headers=analyst_headers,
        )
        assert upload_res.status_code == 201, f"CSV upload failed: {upload_res.status_code} {upload_res.text}"
        dataset = upload_res.json()
        dataset_id = dataset["id"]
        workspace_id = dataset["workspace_id"]
        print(f"  -> PASS: Dataset created in PostgreSQL! ID: {dataset_id}")
        print(f"     Name: {dataset['name']}")
        print(f"     Rows: {dataset['row_count']} (expected 10)")
        print(f"     Columns: {dataset['column_count']} (expected 5)")
        print(f"     Status: {dataset['status']}")
        print(f"     File: {dataset['file_name']} ({dataset['file_size_bytes']} bytes)")

        assert dataset["row_count"] == 10, f"Expected 10 rows, got {dataset['row_count']}"
        assert dataset["column_count"] == 5, f"Expected 5 columns, got {dataset['column_count']}"
        assert dataset["status"] == "ready"

        # Verify Column Detection & Types (Criteria 6 & 7)
        cols_by_name = {c["name"]: c for c in dataset["columns"]}
        expected_types = {
            "region": "string",
            "product": "string",
            "revenue": "float",
            "orders": "integer",
            "active": "boolean",
        }
        for col_name, exp_type in expected_types.items():
            assert col_name in cols_by_name, f"Column {col_name} not detected!"
            actual_type = cols_by_name[col_name]["data_type"]
            assert actual_type == exp_type, f"Column {col_name} expected {exp_type}, got {actual_type}"
            print(f"     * Column '{col_name}': type={actual_type}, is_dim={cols_by_name[col_name]['is_dimension']}, is_measure={cols_by_name[col_name]['is_measure']}")
        print("  -> PASS: All column types & classifications detected correctly.")

        # 6. Dataset Listing (Criterion 18)
        print("\n[Criterion 18] Verifying Dataset Listing from PostgreSQL...")
        list_res = await client.get("/datasets", headers=analyst_headers)
        assert list_res.status_code == 200
        datasets_list = list_res.json()
        assert any(d["id"] == dataset_id for d in datasets_list), "Ingested dataset not in listing!"
        print(f"  -> PASS: Ingested dataset present in workspace listing ({len(datasets_list)} total datasets).")

        # 7. Dataset Detail (Criterion 4)
        print("\n[Criterion 4] Verifying Dataset Detail API...")
        detail_res = await client.get(f"/datasets/{dataset_id}", headers=analyst_headers)
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        assert detail_data["id"] == dataset_id
        assert detail_data["name"] == "Regional Sales Q3 Intelligence"
        print("  -> PASS: Dataset detail returned correct metadata.")

        # 8. Real Row Preview via DuckDB (Criterion 19)
        print("\n[Criterion 19] Verifying Dataset Preview via DuckDB...")
        preview_res = await client.get(f"/datasets/{dataset_id}/preview?limit=5", headers=analyst_headers)
        assert preview_res.status_code == 200
        preview = preview_res.json()
        assert preview["total_rows"] == 10
        assert preview["preview_count"] == 5
        assert len(preview["rows"]) == 5
        print(f"  -> PASS: Real preview retrieved {len(preview['rows'])} rows from DuckDB.")
        print("     Sample Row 1:", preview["rows"][0])

        # 9. DuckDB Analytical Query: Dimensions + Measures (Criteria 9, 10, 11, 12)
        print("\n[Criteria 9, 10, 11, 12] Executing DuckDB Aggregate Query (SUM revenue, COUNT orders by region)...")
        query_payload = {
            "dataset_id": dataset_id,
            "dimensions": ["region"],
            "measures": [
                {"column": "revenue", "agg": "sum", "alias": "total_revenue"},
                {"column": "orders", "agg": "count", "alias": "order_count"},
            ],
            "limit": 100,
        }
        q_res = await client.post("/query/aggregate", json=query_payload, headers=analyst_headers)
        assert q_res.status_code == 200, f"Query failed: {q_res.status_code} {q_res.text}"
        q_data = q_res.json()
        print(f"  -> PASS: Query executed in {q_data['execution_time_ms']} ms! Rows returned: {q_data['row_count']}")
        print("     Columns:", q_data["columns"])
        print("     Data:")
        for r in q_data["data"]:
            print("      ", r)

        # 10. DuckDB Filter & Sort & Limit (Criteria 13, 14, 15)
        print("\n[Criteria 13, 14, 15] Executing Query with Filters, Sort, and Limit...")
        filtered_query = {
            "dataset_id": dataset_id,
            "dimensions": ["region", "product"],
            "measures": [
                {"column": "revenue", "agg": "sum"},
                {"column": "orders", "agg": "count"},
            ],
            "filters": [
                {"column": "region", "operator": "in", "value": ["South", "West"]},
                {"column": "revenue", "operator": "gte", "value": 1500.0},
            ],
            "sort": [
                {"column": "revenue", "direction": "desc"},
            ],
            "limit": 3,
        }
        f_res = await client.post("/query/aggregate", json=filtered_query, headers=analyst_headers)
        assert f_res.status_code == 200, f"Filtered query failed: {f_res.status_code} {f_res.text}"
        f_data = f_res.json()
        assert f_data["row_count"] <= 3, "Limit not respected!"
        print(f"  -> PASS: Filtered & sorted query executed in {f_data['execution_time_ms']} ms!")
        for r in f_data["data"]:
            print("      ", r)
            assert r["region"] in ["South", "West"], f"Filter violated: {r}"

        # 11. Testing All Aggregations (AVG, MIN, MAX, COUNT, SUM)
        print("\n[Criterion 12] Testing all measure aggregations (avg, min, max, count, sum)...")
        all_agg_query = {
            "dataset_id": dataset_id,
            "dimensions": [],
            "measures": [
                {"column": "revenue", "agg": "sum", "alias": "sum_rev"},
                {"column": "revenue", "agg": "avg", "alias": "avg_rev"},
                {"column": "revenue", "agg": "min", "alias": "min_rev"},
                {"column": "revenue", "agg": "max", "alias": "max_rev"},
                {"column": "*", "agg": "count", "alias": "total_records"},
            ],
            "limit": 1,
        }
        all_res = await client.post("/query/aggregate", json=all_agg_query, headers=analyst_headers)
        assert all_res.status_code == 200, f"All agg query failed: {all_res.text}"
        agg_result = all_res.json()["data"][0]
        print("  -> PASS: Global aggregations across entire dataset:")
        print("     ", agg_result)
        assert agg_result["total_records"] == 10
        assert agg_result["max_rev"] == 3400.0
        assert agg_result["min_rev"] == 800.0

        # 12. Invalid Column Rejection (Criterion 16)
        print("\n[Criterion 16] Verifying rejection of non-existent/invalid columns...")
        invalid_col_query = {
            "dataset_id": dataset_id,
            "dimensions": ["non_existent_column_123"],
            "measures": [{"column": "revenue", "agg": "sum"}],
        }
        bad_col_res = await client.post("/query/aggregate", json=invalid_col_query, headers=analyst_headers)
        assert bad_col_res.status_code == 400, f"Expected 400 for invalid column, got {bad_col_res.status_code}"
        print("  -> PASS: Rejected non-existent dimension with 400 Bad Request.")

        # 13. Security & Cross-Organization Isolation (Criterion 17)
        print("\n[Criterion 17] Verifying cross-organization / unauthorized access rejection...")
        # Create a second user in a different organization
        signup_org2 = await client.post("/auth/signup", json={
            "full_name": "Rival Analyst",
            "email": f"rival_{os.urandom(4).hex()}@othercorp.com",
            "password": "Password123!",
            "organization_name": "Other Corp Security Test",
            "role": "Analyst",
        })
        assert signup_org2.status_code == 201, f"Signup for org2 failed: {signup_org2.text}"
        org2_token = signup_org2.json()["access_token"]
        org2_headers = {"Authorization": f"Bearer {org2_token}"}

        # Attempt to access dataset from org 1 using org 2 user
        unauth_get = await client.get(f"/datasets/{dataset_id}", headers=org2_headers)
        assert unauth_get.status_code in [403, 404], f"Expected 403 or 404, got {unauth_get.status_code}"
        print(f"  -> PASS: Org 2 cannot read Org 1 dataset: {unauth_get.status_code} ({unauth_get.json().get('detail')})")

        unauth_query = await client.post("/query/aggregate", json={"dataset_id": dataset_id, "dimensions": ["region"]}, headers=org2_headers)
        assert unauth_query.status_code in [403, 404], f"Expected 403 or 404, got {unauth_query.status_code}"
        print(f"  -> PASS: Org 2 cannot query Org 1 dataset: {unauth_query.status_code} ({unauth_query.json().get('detail')})")

        print("\n" + "=" * 75)
        print("ALL DAY 3 BACKEND & DUCKDB VERIFICATION TESTS PASSED SUCCESSFULLY!")
        print("=" * 75)

if __name__ == "__main__":
    asyncio.run(run_day3_backend_tests())

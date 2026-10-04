"""
RicozViz Data Ingestion Serialization & Error Security Regression Suite
Verifies:
1. Safe handling of dates, datetimes, decimals, ints, floats, NaN, Infinity, NULL.
2. Long column names (>255 chars) and unusual column names (quotes, unicode, SQL injection payloads).
3. PostgreSQL JSONB validity for sample_values (zero TypeError).
4. Information Leakage Prevention: Zero SQL statements, UUID parameter dumps, filesystem paths,
   connection strings, or Python tracebacks in error responses.
"""

import asyncio
import io
import json
import math
import os
import re
import sys
import uuid
from typing import Dict, Any, List

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import httpx
from app.main import app
from app.database import AsyncSessionLocal
from app.models.data import Dataset, DatasetColumn
from sqlalchemy import select, delete

# Leakage patterns to ban in all API error responses
LEAKAGE_PATTERNS = [
    (r'\[SQL:', "Raw SQL query dump"),
    (r'INSERT INTO', "INSERT statement leak"),
    (r'SELECT\s+.*\s+FROM', "SELECT query leak"),
    (r'UPDATE\s+.*\s+SET', "UPDATE statement leak"),
    (r'UUID\([\'"][0-9a-fA-F\-]{36}[\'"]\)', "UUID parameter dump"),
    (r'\[parameters:', "SQL query parameters dump"),
    (r'[A-Za-z]:[\\/][^\s\'"]*uploads', "Server filesystem path leak"),
    (r'postgresql(\+[a-z]+)?://', "Database connection URI leak"),
    (r'asyncpg\.exceptions', "Internal asyncpg driver exception leak"),
    (r'sqlalchemy\.(dialects|exc)', "SQLAlchemy internal exception leak"),
    (r'Traceback \(most recent call last\)', "Python stack trace leak"),
    (r'builtins\.TypeError', "Python built-in exception class leak"),
]

def assert_no_leakage(text: str, context: str = "") -> List[str]:
    """Returns a list of violations found in text."""
    violations = []
    for pattern, desc in LEAKAGE_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            violations.append(f"{desc} (pattern: {pattern}) in {context}")
    return violations

async def run_ingestion_security_regression():
    print("=" * 80)
    print("RICOZVIZ DATA INGESTION SERIALIZATION & ERROR SECURITY REGRESSION SUITE")
    print("=" * 80)

    results = []
    created_dataset_ids = []

    def record(name: str, passed: bool, details: str = ""):
        status_str = "PASS" if passed else "FAIL"
        print(f"[{status_str}] {name}: {details}")
        results.append((name, passed, details))

    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test", timeout=30.0) as client:

            # 1. Authenticate Analyst
            print("\n--- 1. Authenticating Analyst Persona ---")
            login_res = await client.post("/api/auth/login", json={"email": "analyst@ricozviz.com", "password": "analyst123"})
            if login_res.status_code != 200:
                print("Failed to authenticate analyst!")
                return False
            token = login_res.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            record("Analyst Auth", True, "Successfully acquired JWT token")

            # -------------------------------------------------------------
            # 2. Upload with Dates, Datetimes, Decimals, NaNs, Infs, Nulls
            # -------------------------------------------------------------
            print("\n--- 2. Ingestion of Dates, Decimals, NaN, Infs, & Nulls ---")
            long_col_name = "x" * 320  # Exceeds 255 chars
            unusual_cols_csv = f"""id,player_name,dob,registered_at,wage_decimal,rating_float,val_nan,val_inf,missing_val,col with spaces,"col""quoted",unicode_球员,sql_inj'; DROP TABLE--, {long_col_name}
1,Lionel Messi,1987-06-24,2024-01-10 14:30:00,560000.75,93.5,NaN,Infinity,,North,"quoted val",梅西,safe_val,long_val_1
2,Cristiano Ronaldo,1985-02-05,2024-02-15 09:15:30,450000.50,91.0,NaN,-Infinity,Extra,South,"another quote",C罗,safe_val_2,long_val_2
3,Kylian Mbappe,1998-12-20,2024-03-01 18:00:00,600000.00,92.0,NaN,Infinity,NULL,East,"third quote",姆巴佩,safe_val_3,long_val_3
"""
            files = {"file": ("complex_types.csv", io.BytesIO(unusual_cols_csv.encode("utf-8")), "text/csv")}
            up_r = await client.post("/api/datasets/upload", headers=headers, files=files, data={"name": "Complex Types & Edge Columns"})
            
            if up_r.status_code == 201:
                ds_data = up_r.json()
                created_dataset_ids.append(ds_data["id"])
                
                # Check that response returned valid columns
                cols = ds_data.get("columns", [])
                record("Upload Complex Dataset (Status 201)", True, f"Created dataset {ds_data['id']} with {len(cols)} columns")
            else:
                record("Upload Complex Dataset (Status 201)", False, f"Returned status {up_r.status_code}: {up_r.text}")

            # -------------------------------------------------------------
            # 3. Database Persistence & JSONB Verification
            # -------------------------------------------------------------
            print("\n--- 3. PostgreSQL JSONB sample_values Verification ---")
            if created_dataset_ids:
                ds_uuid = uuid.UUID(created_dataset_ids[-1])
                async with AsyncSessionLocal() as db:
                    col_stmt = select(DatasetColumn).where(DatasetColumn.dataset_id == ds_uuid)
                    col_res = await db.execute(col_stmt)
                    db_cols = col_res.scalars().all()
                    
                    jsonb_ok = True
                    serialization_error = None
                    sample_summary = {}

                    for c in db_cols:
                        # Ensure column name <= 255 chars
                        if len(c.name) > 255:
                            jsonb_ok = False
                            serialization_error = f"Column name length {len(c.name)} exceeds 255"
                            break

                        # Test native json serialization of sample_values
                        try:
                            serialized = json.dumps(c.sample_values)
                            deserialized = json.loads(serialized)
                            if not isinstance(deserialized, list):
                                jsonb_ok = False
                                serialization_error = f"sample_values is not a list for column {c.name}"
                                break
                            sample_summary[c.name] = deserialized
                        except Exception as ex:
                            jsonb_ok = False
                            serialization_error = f"TypeError / Serialization error on column {c.name}: {ex}"
                            break

                    record("PostgreSQL JSONB Serialization", jsonb_ok, serialization_error or f"All {len(db_cols)} columns serialized to valid JSON without TypeError")
                    
                    # Verify date format in JSON
                    dob_samples = sample_summary.get("dob", [])
                    date_iso_ok = all(isinstance(x, str) and re.match(r'^\d{4}-\d{2}-\d{2}', x) for x in dob_samples if x)
                    record("Date ISO Format in JSONB", date_iso_ok, f"dob samples serialized as ISO strings: {dob_samples}")

                    # Verify NaN was converted to None / null
                    nan_samples = sample_summary.get("val_nan", [])
                    nan_ok = all(x is None for x in nan_samples)
                    record("NaN to null Conversion", nan_ok, f"val_nan serialized as None: {nan_samples}")

            # -------------------------------------------------------------
            # 4. Preview Endpoint Serialization
            # -------------------------------------------------------------
            print("\n--- 4. Preview Endpoint Serialization ---")
            if created_dataset_ids:
                preview_r = await client.get(f"/api/datasets/{created_dataset_ids[-1]}/preview?limit=10", headers=headers)
                preview_ok = preview_r.status_code == 200 and len(preview_r.json().get("rows", [])) > 0
                record("Preview Dataset (Status 200)", preview_ok, f"Returned {len(preview_r.json().get('rows', []))} rows")

            # -------------------------------------------------------------
            # 5. Information Leakage on Invalid Uploads
            # -------------------------------------------------------------
            print("\n--- 5. Information Leakage Tests on Invalid Uploads ---")
            
            test_invalid_cases = [
                ("Empty CSV (0 bytes)", b"", "empty.csv", 400),
                ("Binary EXE file", b"MZ\x90\x00\x03\x00\x00\x00", "malicious.csv", 400),
                ("Invalid Extension", b"name,age\nAlice,30", "test.txt", 400),
                ("No Headers / Corrupt", b"\x00\x01\x02\x03\x04", "corrupt.csv", 400),
            ]

            leak_free_all = True
            for test_name, content, filename, expected_status in test_invalid_cases:
                bad_files = {"file": (filename, io.BytesIO(content), "text/csv")}
                bad_r = await client.post("/api/datasets/upload", headers=headers, files=bad_files)
                
                resp_text = bad_r.text
                leaks = assert_no_leakage(resp_text, context=test_name)
                
                status_ok = bad_r.status_code == expected_status
                if leaks or not status_ok:
                    leak_free_all = False
                    record(f"Invalid Upload: {test_name}", False, f"Status: {bad_r.status_code} (expected {expected_status}), Leaks: {leaks}")
                else:
                    detail = bad_r.json().get("detail", "")
                    record(f"Invalid Upload: {test_name}", True, f"Clean 400 error: '{detail}' (0 leaks)")

            record("Error Leakage Protection", leak_free_all, "Zero SQL, UUID parameter dumps, paths, or stack traces leaked")

            # -------------------------------------------------------------
            # 6. Cleanup Created Test Datasets
            # -------------------------------------------------------------
            print("\n--- 6. Cleanup Test Datasets ---")
            async with AsyncSessionLocal() as db:
                for ds_id in created_dataset_ids:
                    await db.execute(delete(Dataset).where(Dataset.id == uuid.UUID(ds_id)))
                await db.commit()
            record("Database Cleanup", True, f"Purged {len(created_dataset_ids)} test datasets")

    print("\n" + "=" * 80)
    print("REGRESSION AUDIT SUMMARY:")
    passed_count = sum(1 for _, p, _ in results if p)
    total_count = len(results)
    print(f"Total Tests: {passed_count}/{total_count} PASSED")
    print("=" * 80)

    return passed_count == total_count

if __name__ == "__main__":
    success = asyncio.run(run_ingestion_security_regression())
    sys.exit(0 if success else 1)

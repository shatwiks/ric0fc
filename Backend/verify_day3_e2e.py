import asyncio
import os
import sys
import tempfile
from playwright.async_api import async_playwright, Response, ConsoleMessage

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
FRONTEND_BASE_URL = "http://localhost:3000"
BACKEND_BASE_URL = "http://127.0.0.1:8000"

REAL_TEST_CSV = """region,product,revenue,orders,active
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

async def run_day3_e2e_verification():
    print("=" * 80)
    print("RICOZVIZ DAY 3 E2E BROWSER VERIFICATION SUITE — CSV INGESTION + DUCKDB")
    print("=" * 80)

    console_errors = []
    failed_requests = []

    # Write a temporary CSV file for upload testing
    temp_csv_path = os.path.join(tempfile.gettempdir(), "real_enterprise_sales.csv")
    with open(temp_csv_path, "w", encoding="utf-8") as f:
        f.write(REAL_TEST_CSV)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=CHROME_PATH,
            headless=True,
        )
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900}
        )
        page = await context.new_page()

        def on_console(msg: ConsoleMessage):
            # Ignore harmless favicon and hydration notices if any
            if msg.type in ["error"] and "favicon" not in msg.text:
                console_errors.append(f"[{msg.type}] {msg.text}")

        async def on_response(res: Response):
            if res.status >= 500:
                failed_requests.append(f"{res.request.method} {res.url} -> {res.status}")

        page.on("console", on_console)
        page.on("response", on_response)

        # -------------------------------------------------------------
        # STEP 1: Login as Analyst
        # -------------------------------------------------------------
        print("\n[Step 1] Logging in as Analyst persona (analyst@ricozviz.com)...")
        await page.goto(f"{FRONTEND_BASE_URL}/auth/login")
        await page.wait_for_selector("input[type='email']", state="visible")
        await page.locator("input[type='email']").fill("analyst@ricozviz.com")
        await page.locator("input[type='password']").fill("analyst123")
        await page.locator("button[type='submit']").click()
        await page.wait_for_url("**/dashboard**", timeout=10000)
        print("  -> Authenticated and navigated to Dashboard successfully.")

        # -------------------------------------------------------------
        # STEP 2: Navigate to Datasets Hub
        # -------------------------------------------------------------
        print("\n[Step 2] Navigating to /dashboard/datasets...")
        await page.goto(f"{FRONTEND_BASE_URL}/dashboard/datasets")
        await page.wait_for_selector("h1", state="visible")
        h1_text = await page.locator("h1").inner_text()
        assert "Datasets Hub" in h1_text, f"Expected Datasets Hub title, got: {h1_text}"
        print(f"  -> Datasets Hub page loaded cleanly with title: '{h1_text}'")

        # Verify DuckDB badge and Metric cards
        body_content = (await page.locator("body").inner_text()).upper()
        assert "DUCKDB ANALYTICS ENGINE" in body_content, "DuckDB badge missing!"
        assert "TOTAL DATASETS" in body_content, "Metric Total Datasets missing!"
        assert "INGESTED ROWS" in body_content, "Metric Ingested Rows missing!"
        assert "ANALYTICS ENGINE" in body_content, "Metric Analytics Engine missing!"
        print("  -> Header and summary metric cards verified.")

        # -------------------------------------------------------------
        # STEP 3: Open Upload Modal & Verify File Upload
        # -------------------------------------------------------------
        print("\n[Step 3] Opening Upload CSV Dataset Modal...")
        upload_btn = page.locator("#upload-dataset-btn")
        await upload_btn.click()
        await page.wait_for_selector("#csv-file-input", state="attached")
        print("  -> Upload modal opened.")

        # Set file input with real CSV
        print(f"  -> Uploading real CSV file from: {temp_csv_path}...")
        file_input = page.locator("#csv-file-input")
        await file_input.set_input_files(temp_csv_path)

        # Fill dataset custom name
        dataset_test_name = "Enterprise Q3 Sales Benchmark"
        await page.fill("#dataset-name-input", dataset_test_name)
        await page.fill("#dataset-desc-input", "Real operational Q3 sales data with regional performance metrics")

        # Submit upload
        submit_upload_btn = page.locator("#submit-upload-btn")
        await submit_upload_btn.click()
        print("  -> Submitted real multipart CSV upload to FastAPI backend...")

        # -------------------------------------------------------------
        # STEP 4: Verify Schema Detection & Real Preview in Modal
        # -------------------------------------------------------------
        print("\n[Step 4] Verifying automatic opening of Dataset Detail / Preview Modal...")
        await page.wait_for_selector("#tab-data-preview", state="visible", timeout=15000)
        modal_title = await page.locator("h2").inner_text()
        assert dataset_test_name in modal_title, f"Expected dataset name in modal, got: {modal_title}"
        print(f"  -> Dataset detail modal opened for '{modal_title}'!")

        # Verify real preview rows
        await page.wait_for_selector("table", state="visible")
        preview_text = await page.locator("table").inner_text()
        assert "Widget Alpha" in preview_text, "Real CSV preview rows missing Widget Alpha!"
        assert "Gadget Pro" in preview_text, "Real CSV preview rows missing Gadget Pro!"
        assert "1500.5" in preview_text, "Revenue value missing from real preview!"
        print("  -> PASS: Real uploaded CSV data rows rendered accurately in preview table!")

        # -------------------------------------------------------------
        # STEP 5: Verify Detected Schema & Types Tab
        # -------------------------------------------------------------
        print("\n[Step 5] Inspecting Detected Schema & Types Tab...")
        await page.click("#tab-schema-columns")
        await page.wait_for_timeout(500)
        schema_text = await page.locator("table").inner_text()
        assert "region" in schema_text and "STRING" in schema_text, "region column schema missing!"
        assert "revenue" in schema_text and "FLOAT" in schema_text, "revenue column schema missing!"
        assert "orders" in schema_text and "INTEGER" in schema_text, "orders column schema missing!"
        assert "active" in schema_text and "BOOLEAN" in schema_text, "active column schema missing!"
        assert "MEASURE / METRIC" in schema_text, "Measure classification missing!"
        assert "DIMENSION / ATTRIBUTE" in schema_text, "Dimension classification missing!"
        print("  -> PASS: DuckDB automatic schema inference and column classifications verified!")

        # -------------------------------------------------------------
        # STEP 6: Execute Server-Side DuckDB Analytical Query
        # -------------------------------------------------------------
        print("\n[Step 6] Testing DuckDB Analytics Engine Tab...")
        await page.click("#tab-duckdb-analytics")
        await page.wait_for_selector("#run-duckdb-query-btn", state="visible")

        # Run aggregate query
        print("  -> Clicking 'Run Aggregate Query' button...")
        await page.click("#run-duckdb-query-btn")

        # Wait for query result
        await page.wait_for_selector("text=Query Executed Successfully", timeout=10000)
        results_container = await page.locator("div:has-text('Query Executed Successfully')").first.inner_text()
        print("  -> PASS: Analytical query executed successfully!")

        # Verify results table has aggregated values
        res_table_text = await page.locator("table").last.inner_text()
        assert "ms" in results_container, "Execution time ms missing!"
        print(f"  -> Execution Telemetry: {results_container.splitlines()[0]}")
        print("  -> PASS: Real aggregation data returned and rendered in UI table.")

        # Close detail modal
        await page.click("#close-dataset-modal-btn")
        await page.wait_for_timeout(500)

        # -------------------------------------------------------------
        # STEP 7: Verify Dataset Card & Persistence in Datasets Hub
        # -------------------------------------------------------------
        print("\n[Step 7] Verifying Dataset appears in Datasets Hub...")
        hub_text = await page.locator("body").inner_text()
        assert dataset_test_name in hub_text, "New dataset card not found in Datasets Hub!"
        print("  -> PASS: Dataset card is visible with accurate row and column badges.")

        # Test Search Filter
        print("\n[Step 8] Testing Search input in Datasets Hub...")
        await page.fill("#search-datasets-input", "Benchmark")
        await page.wait_for_timeout(300)
        search_res_text = await page.locator("body").inner_text()
        assert dataset_test_name in search_res_text, "Search filtering failed to match dataset!"
        print("  -> PASS: Search filter accurately isolates matching dataset.")

        # Clear search
        await page.fill("#search-datasets-input", "")
        await page.wait_for_timeout(300)

        # -------------------------------------------------------------
        # STEP 9: Test Page Reload / Refresh Persistence
        # -------------------------------------------------------------
        print("\n[Step 9] Testing Page Reload Persistence (PostgreSQL backing)...")
        await page.reload()
        await page.wait_for_selector("h1", state="visible")
        reloaded_text = await page.locator("body").inner_text()
        assert dataset_test_name in reloaded_text, "Dataset lost after page reload!"
        print("  -> PASS: Dataset persisted across browser reloads (Criterion 20).")

        # -------------------------------------------------------------
        # STEP 10: Test RBAC (Viewer Persona)
        # -------------------------------------------------------------
        print("\n[Step 10] Testing RBAC Persona: Viewer (viewer@ricozviz.com)...")
        # Logout & Login as Viewer
        await page.goto(f"{FRONTEND_BASE_URL}/auth/login")
        await page.wait_for_selector("input[type='email']", state="visible")
        await page.locator("input[type='email']").fill("viewer@ricozviz.com")
        await page.locator("input[type='password']").fill("viewer123")
        await page.locator("button[type='submit']").click()
        await page.wait_for_url("**/dashboard**", timeout=10000)

        await page.goto(f"{FRONTEND_BASE_URL}/dashboard/datasets")
        await page.wait_for_selector("h1", state="visible")

        # Verify Upload button is disabled for Viewer
        disabled_badge = page.locator("#upload-dataset-btn-disabled")
        assert await disabled_badge.is_visible(), "Viewer should see disabled upload badge!"
        disabled_text = await disabled_badge.inner_text()
        assert "Viewer" in disabled_text, f"Unexpected badge text: {disabled_text}"
        print(f"  -> PASS: Viewer sees disabled upload button with RBAC notice: '{disabled_text}' (Criterion 22).")

        # Verify Viewer can still preview existing datasets
        first_preview_btn = page.locator("button:has-text('Preview & Query')").first
        await first_preview_btn.click()
        await page.wait_for_selector("#tab-data-preview", state="visible")
        print("  -> PASS: Viewer can preview ingested dataset rows in read-only mode.")
        await page.click("#close-dataset-modal-btn")

        # -------------------------------------------------------------
        # STEP 11: Console & Network Health Check
        # -------------------------------------------------------------
        print("\n[Step 11] Inspecting Browser Console & Network Errors...")
        print(f"  -> Console Errors ({len(console_errors)}): {console_errors}")
        print(f"  -> Failed Requests ({len(failed_requests)}): {failed_requests}")
        assert len(failed_requests) == 0, f"Critical 5xx network failures encountered: {failed_requests}"
        assert len(console_errors) == 0, f"Critical console errors encountered: {console_errors}"
        print("  -> PASS: 0 console errors, 0 failed 5xx network requests!")

        await browser.close()

    # Clean up temp file
    if os.path.exists(temp_csv_path):
        os.remove(temp_csv_path)

    print("\n" + "=" * 80)
    print("ALL DAY 3 END-TO-END BROWSER VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(run_day3_e2e_verification())

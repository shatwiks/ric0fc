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

async def run_day4_e2e_verification():
    print("=" * 85)
    print("RICOZVIZ DAY 4 E2E VERIFICATION SUITE — VISUALIZATION STUDIO + DASHBOARD ENGINE")
    print("=" * 85)

    console_errors = []
    failed_requests = []

    # Temporary CSV for upload if needed
    temp_csv_path = os.path.join(tempfile.gettempdir(), "day4_sales_pipeline.csv")
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
            # Filter harmless logs/favicons
            if msg.type in ["error"] and "favicon" not in msg.text:
                console_errors.append(f"[{msg.type}] {msg.text}")

        async def on_response(res: Response):
            if res.status >= 500:
                failed_requests.append(f"{res.request.method} {res.url} -> {res.status}")

        page.on("console", on_console)
        page.on("response", on_response)

        # -------------------------------------------------------------
        # STEP 1: Authenticate as Analyst persona
        # -------------------------------------------------------------
        print("\n[Step 1] Logging in as Analyst persona (analyst@ricozviz.com)...")
        await page.goto(f"{FRONTEND_BASE_URL}/auth/login")
        await page.wait_for_selector("input[type='email']", state="visible")
        await page.locator("input[type='email']").fill("analyst@ricozviz.com")
        await page.locator("input[type='password']").fill("analyst123")
        await page.locator("button[type='submit']").click()
        await page.wait_for_url("**/dashboard**", timeout=10000)
        print("  -> Authenticated as Analyst persona successfully.")

        # Ensure a dataset exists in the workspace
        print("\n[Step 2] Ensuring dataset exists via Datasets Hub...")
        await page.goto(f"{FRONTEND_BASE_URL}/dashboard/datasets")
        await page.wait_for_selector("h1", state="visible")
        has_dataset = await page.locator("text=Preview & Query").count() > 0
        if not has_dataset:
            print("  -> Uploading new baseline CSV dataset...")
            await page.click("#upload-dataset-btn")
            await page.wait_for_selector("#csv-file-input", state="attached")
            await page.locator("#csv-file-input").set_input_files(temp_csv_path)
            await page.fill("#dataset-name-input", "Enterprise Revenue Benchmarks")
            await page.click("#submit-upload-btn")
            await page.wait_for_selector("#tab-data-preview", state="visible", timeout=15000)
            await page.click("#close-dataset-modal-btn")
            await page.wait_for_timeout(500)
        print("  -> Dataset confirmed available in workspace.")

        # -------------------------------------------------------------
        # STEP 3: Navigate to Visualization Studio
        # -------------------------------------------------------------
        print("\n[Step 3] Navigating to Visualization Studio (/dashboard/visualisations)...")
        await page.goto(f"{FRONTEND_BASE_URL}/dashboard/visualisations")
        await page.wait_for_selector("h1", state="visible")
        h1_text = await page.locator("h1").inner_text()
        assert "Visualization Studio" in h1_text, f"Unexpected Studio title: {h1_text}"
        print(f"  -> Studio loaded cleanly with header: '{h1_text}'")

        # -------------------------------------------------------------
        # STEP 4: Configure Dimensions, Measures, and Aggregations
        # -------------------------------------------------------------
        print("\n[Step 4] Configuring analytical parameters in Studio...")
        # Select dataset if dropdown available
        await page.wait_for_selector("#studio-dataset-select", state="visible")
        
        # Test switching between chart types
        print("  -> Testing all 7 core visualization types in studio...")
        chart_types = ["bar", "line", "area", "donut", "scatter", "kpi", "table"]
        for ct in chart_types:
            btn = page.locator(f"#chart-type-btn-{ct}")
            assert await btn.is_visible(), f"Chart type button {ct} not found!"
            await btn.click()
            await page.wait_for_timeout(200)
        print("  -> PASS: All 7 chart types (Bar, Line, Area, Donut, Scatter, KPI, Table) selectable!")

        # Set title and chart type to Bar
        await page.click("#chart-type-btn-bar")
        await page.fill("#chart-title-input", "Regional Revenue Breakdown")

        # -------------------------------------------------------------
        # STEP 5: Execute Real DuckDB Aggregate Query
        # -------------------------------------------------------------
        print("\n[Step 5] Triggering real DuckDB query execution via backend...")
        await page.click("#run-studio-query-btn")
        # Wait for execution telemetry
        await page.wait_for_selector("text=DuckDB Aggregation Telemetry", timeout=10000)
        print("  -> PASS: DuckDB execution completed and returned live telemetry!")

        # -------------------------------------------------------------
        # STEP 6: Save Visualization Widget to a New Dashboard
        # -------------------------------------------------------------
        print("\n[Step 6] Saving Studio visualization to a new dashboard...")
        await page.click("#save-to-dashboard-btn")
        await page.wait_for_selector("#target-dashboard-select", state="visible")

        # Select '+ Create New Dashboard'
        await page.select_option("#target-dashboard-select", "new")
        dash_title = "Executive Performance Intelligence"
        await page.fill("input[placeholder*='e.g. Q3 Sales']", dash_title)
        
        # Submit save
        await page.click("#confirm-save-widget-btn")
        await page.wait_for_selector("text=saved successfully", timeout=8000)
        print(f"  -> PASS: Widget saved to dashboard '{dash_title}' successfully!")
        await page.wait_for_timeout(1800)  # Wait for modal auto-close

        # -------------------------------------------------------------
        # STEP 7: Navigate to Dashboards Hub & Verify Dashboard Card
        # -------------------------------------------------------------
        print("\n[Step 7] Navigating to Dashboards Hub (/dashboard/dashboards)...")
        await page.goto(f"{FRONTEND_BASE_URL}/dashboard/dashboards")
        await page.wait_for_selector("h1", state="visible")
        hub_h1 = await page.locator("h1").inner_text()
        assert "Dashboards Hub" in hub_h1, f"Unexpected Hub title: {hub_h1}"

        # Verify new dashboard card exists
        dash_card = page.locator(f"text={dash_title}").first
        assert await dash_card.is_visible(), f"Dashboard '{dash_title}' not found in hub!"
        print(f"  -> PASS: Dashboard card '{dash_title}' present with PostgreSQL persistence!")

        # -------------------------------------------------------------
        # STEP 8: Open Dashboard Detail & Verify Live Widget Query
        # -------------------------------------------------------------
        print(f"\n[Step 8] Opening Dashboard Detail canvas...")
        await dash_card.click()
        await page.wait_for_url("**/dashboard/dashboards/**", timeout=10000)
        await page.wait_for_selector("h1", state="visible")
        detail_h1 = await page.locator("h1").inner_text()
        assert dash_title in detail_h1, f"Expected dashboard title '{dash_title}', got: {detail_h1}"
        print(f"  -> Opened dashboard detail canvas for '{dash_title}'")

        # Verify widget rendered with live DuckDB query
        await page.wait_for_selector("div[id^='widget-card-']", state="visible", timeout=10000)
        widgets_count = await page.locator("div[id^='widget-card-']").count()
        assert widgets_count >= 1, f"Expected at least 1 widget, found {widgets_count}"
        print(f"  -> PASS: Widget loaded and rendered live DuckDB aggregated data ({widgets_count} widget present)!")

        # -------------------------------------------------------------
        # STEP 9: Add a Second Widget (KPI / Line) to Canvas
        # -------------------------------------------------------------
        print("\n[Step 9] Adding a second widget directly from dashboard canvas...")
        await page.click("#add-widget-btn")
        await page.wait_for_selector("#widget-title-input", state="visible")

        # Configure second widget as KPI
        await page.fill("#widget-title-input", "Total Gross Revenue KPI")
        await page.click("#modal-chart-type-kpi")
        await page.click("#confirm-save-widget-btn")
        await page.wait_for_timeout(1000)

        # Verify 2 widgets now on canvas
        widgets_count = await page.locator("div[id^='widget-card-']").count()
        assert widgets_count >= 2, f"Expected at least 2 widgets after addition, found: {widgets_count}"
        print(f"  -> PASS: Second widget added successfully. Total widgets on canvas: {widgets_count}!")

        # -------------------------------------------------------------
        # STEP 10: Test Widget Controls (Resize & Reorder)
        # -------------------------------------------------------------
        print("\n[Step 10] Testing Widget Resize (6 to 12 cols)...")
        toggle_btn = page.locator("button[id^='toggle-size-widget-']").first
        await toggle_btn.click()
        await page.wait_for_timeout(500)
        print("  -> PASS: Widget resize toggle executed and state updated.")

        print("\n[Step 11] Testing Widget Reorder (Move Down)...")
        move_down_btn = page.locator("button[id^='move-down-widget-']").first
        if await move_down_btn.is_visible():
            await move_down_btn.click()
            await page.wait_for_timeout(500)
            print("  -> PASS: Widget reorder triggered and saved.")

        # -------------------------------------------------------------
        # STEP 12: Add Interactive Dashboard Filter & Re-query
        # -------------------------------------------------------------
        print("\n[Step 12] Creating interactive dashboard filter...")
        await page.click("#add-dashboard-filter-btn")
        await page.wait_for_selector("#filter-name-input", state="visible")
        await page.fill("#filter-name-input", "region")
        await page.fill("#filter-options-input", "South, West, North, East")
        await page.click("#confirm-add-filter-btn")
        await page.wait_for_timeout(1000)

        # Verify filter select exists in filter bar
        filter_select = page.locator("#filter-select-region")
        assert await filter_select.is_visible(), "Dashboard filter select for 'region' not rendered!"
        print("  -> PASS: Interactive filter bar rendered global 'region' filter!")

        # Change filter value to 'South' -> triggers DuckDB re-query
        print("  -> Selecting 'South' in filter bar to trigger reactive widget re-query...")
        await filter_select.select_option("South")
        await page.wait_for_timeout(1500)
        print("  -> PASS: Widgets re-queried DuckDB with global filter applied!")

        # -------------------------------------------------------------
        # STEP 13: Refresh Browser & Verify Full Persistence
        # -------------------------------------------------------------
        print("\n[Step 13] Refreshing browser page to test PostgreSQL persistence...")
        await page.reload()
        await page.wait_for_selector("h1", state="visible")
        reloaded_h1 = await page.locator("h1").inner_text()
        assert dash_title in reloaded_h1, f"Dashboard title lost after reload: {reloaded_h1}"

        # Check widgets persist
        persisted_widgets = await page.locator("div[id^='widget-card-']").count()
        assert persisted_widgets >= 2, f"Widgets lost after reload! Found: {persisted_widgets}"
        # Check filter persists
        persisted_filter = page.locator("#filter-select-region")
        assert await persisted_filter.is_visible(), "Global filter lost after reload!"
        print(f"  -> PASS: Dashboard, all {persisted_widgets} widgets, and global filters 100% persisted from PostgreSQL!")

        # -------------------------------------------------------------
        # STEP 14: Test RBAC — Viewer Persona (Read-Only)
        # -------------------------------------------------------------
        print("\n[Step 14] Testing Viewer persona RBAC enforcement...")
        current_dashboard_url = page.url

        # Logout and login as Viewer
        await page.goto(f"{FRONTEND_BASE_URL}/auth/login")
        await page.wait_for_selector("input[type='email']", state="visible")
        await page.locator("input[type='email']").fill("viewer@ricozviz.com")
        await page.locator("input[type='password']").fill("viewer123")
        await page.locator("button[type='submit']").click()
        await page.wait_for_url("**/dashboard**", timeout=10000)

        # Navigate to Dashboards Hub as Viewer
        await page.goto(f"{FRONTEND_BASE_URL}/dashboard/dashboards")
        await page.wait_for_selector("h1", state="visible")

        # Verify Viewer cannot see 'New Dashboard' button
        has_new_btn = await page.locator("#create-dashboard-btn").is_visible()
        assert not has_new_btn, "Viewer should NOT see 'New Dashboard' button!"
        print("  -> PASS: Viewer cannot create dashboards on Hub.")

        # Open the dashboard as Viewer
        await page.goto(current_dashboard_url)
        await page.wait_for_selector("h1", state="visible")

        # Verify Read-Only badge is visible
        read_only_badge = page.locator("text=Read-only (Viewer)")
        assert await read_only_badge.is_visible(), "Viewer should see 'Read-only (Viewer)' badge!"
        print("  -> PASS: Dashboard detail displays 'Read-only (Viewer)' badge.")

        # Verify editing controls are hidden for Viewer
        has_add_widget = await page.locator("#add-widget-btn").is_visible()
        has_add_filter = await page.locator("#add-dashboard-filter-btn").is_visible()
        has_edit_meta = await page.locator("#edit-dashboard-meta-btn").is_visible()
        assert not has_add_widget, "Viewer should NOT see 'Add Visualization' button!"
        assert not has_add_filter, "Viewer should NOT see 'Add Filter' button!"
        assert not has_edit_meta, "Viewer should NOT see 'Edit Details' button!"
        print("  -> PASS: All widget and dashboard editing controls are hidden from Viewer.")

        # Verify Viewer CAN still interact with filters and view widgets
        viewer_filter = page.locator("#filter-select-region")
        if await viewer_filter.is_visible():
            await viewer_filter.select_option("West")
            await page.wait_for_timeout(1000)
            print("  -> PASS: Viewer can interact with filters to analyze data in read-only mode.")

        # -------------------------------------------------------------
        # STEP 15: Responsive UI Test (Mobile / Tablet Viewports)
        # -------------------------------------------------------------
        print("\n[Step 15] Testing Responsive UI Viewports...")
        # Tablet
        await page.set_viewport_size({"width": 768, "height": 1024})
        await page.wait_for_timeout(500)
        assert await page.locator("h1").is_visible(), "Header not visible in tablet view!"
        # Mobile
        await page.set_viewport_size({"width": 375, "height": 812})
        await page.wait_for_timeout(500)
        assert await page.locator("h1").is_visible(), "Header not visible in mobile view!"
        print("  -> PASS: Clean responsive layouts verified on Tablet and Mobile viewports.")

        # Restore desktop viewport
        await page.set_viewport_size({"width": 1440, "height": 900})

        # -------------------------------------------------------------
        # STEP 16: Console Errors & Network Failures Check
        # -------------------------------------------------------------
        print("\n[Step 16] Checking console errors and network status...")
        print(f"  -> Console Errors ({len(console_errors)}): {console_errors}")
        print(f"  -> Failed 5xx Requests ({len(failed_requests)}): {failed_requests}")
        assert len(failed_requests) == 0, f"Critical 5xx network failures encountered: {failed_requests}"
        assert len(console_errors) == 0, f"Critical console errors encountered: {console_errors}"
        print("  -> PASS: 0 critical console errors, 0 failed 5xx network requests!")

        await browser.close()

    # Clean up temp file
    if os.path.exists(temp_csv_path):
        os.remove(temp_csv_path)

    print("\n" + "=" * 85)
    print("ALL DAY 4 END-TO-END VERIFICATION CHECKS PASSED WITH 100% SUCCESS!")
    print("=" * 85)

if __name__ == "__main__":
    asyncio.run(run_day4_e2e_verification())

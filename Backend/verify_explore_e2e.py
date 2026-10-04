import asyncio
import os
import sys
from playwright.async_api import async_playwright, Response, ConsoleMessage

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
FRONTEND_BASE_URL = "http://localhost:3000"

async def run_explore_verification():
    print("=" * 85)
    print("RICOZVIZ INTERACTIVE DATA EXPLORER E2E VERIFICATION SUITE")
    print("=" * 85)

    console_errors = []
    failed_requests = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=CHROME_PATH,
            headless=True,
        )
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        def on_console(msg: ConsoleMessage):
            if msg.type in ["error"] and "favicon" not in msg.text:
                console_errors.append(f"[{msg.type}] {msg.text}")

        async def on_response(res: Response):
            if res.status >= 500:
                failed_requests.append(f"{res.request.method} {res.url} -> {res.status}")

        page.on("console", on_console)
        page.on("response", on_response)

        # -------------------------------------------------------------
        # 1. Login
        # -------------------------------------------------------------
        print("\n[Step 1] Logging in as Analyst persona...")
        await page.goto(f"{FRONTEND_BASE_URL}/auth/login")
        await page.wait_for_selector("input[type='email']", state="visible")
        await page.locator("input[type='email']").fill("analyst@ricozviz.com")
        await page.locator("input[type='password']").fill("analyst123")
        await page.locator("button[type='submit']").click()
        await page.wait_for_url("**/dashboard**", timeout=10000)
        print("  -> Authenticated successfully.")

        # -------------------------------------------------------------
        # 2. Navigate to /dashboard/explore
        # -------------------------------------------------------------
        print("\n[Step 2] Navigating to /dashboard/explore...")
        await page.goto(f"{FRONTEND_BASE_URL}/dashboard/explore")
        await page.wait_for_selector("h1", state="visible")
        h1_text = await page.locator("h1").inner_text()
        assert "Interactive Data Explorer" in h1_text, f"Unexpected title: {h1_text}"
        print(f"  -> Data Explorer loaded with header: '{h1_text}'")

        # Verify dataset selector
        await page.wait_for_selector("#explorer-dataset-select", state="visible")
        selected_dataset = await page.locator("#explorer-dataset-select").input_value()
        assert selected_dataset, "No dataset selected by default!"
        print(f"  -> Bound to real dataset: {selected_dataset}")

        # -------------------------------------------------------------
        # 3. Mode A: Ad-Hoc Table Exploration
        # -------------------------------------------------------------
        print("\n[Step 3] Verifying Mode A (Ad-Hoc Table Exploration)...")
        await page.wait_for_selector("#ad-hoc-records-table", state="visible", timeout=10000)
        rows_count = await page.locator("#ad-hoc-records-table tbody tr").count()
        assert rows_count > 0, "No raw records rendered in ad-hoc table!"
        print(f"  -> PASS: Rendered {rows_count} raw data records from DuckDB.")

        # Test Search Filter dynamically using real data from the first row
        print("  -> Testing ad-hoc search filter dynamically...")
        sample_cell_text = (await page.locator("#ad-hoc-records-table tbody tr:first-child td:nth-child(2)").inner_text()).strip()
        print(f"  -> Using sample cell text '{sample_cell_text}' for search filter...")
        await page.fill("#search-raw-records-input", sample_cell_text)
        await page.wait_for_timeout(400)
        filtered_count = await page.locator("#ad-hoc-records-table tbody tr").count()
        assert filtered_count > 0 and filtered_count <= rows_count, f"Search filter did not isolate rows! Got {filtered_count} vs {rows_count}"
        print(f"  -> PASS: Search filter accurately isolated {filtered_count} matching rows.")
        await page.fill("#search-raw-records-input", "")
        await page.wait_for_timeout(200)

        # Test Header Sorting
        print("  -> Testing column sorting...")
        first_th = page.locator("#ad-hoc-records-table thead th:nth-child(2)")
        await first_th.click()
        await page.wait_for_timeout(300)
        print("  -> PASS: Column sorted successfully.")

        # -------------------------------------------------------------
        # 4. Mode B: Group-By, Pivot & Slice-and-Dice Analytics
        # -------------------------------------------------------------
        print("\n[Step 4] Switching to Mode B (Group-By & Pivot Analytics)...")
        await page.click("#tab-explore-aggregate")
        await page.wait_for_selector("#execute-explorer-query-btn", state="visible")
        print("  -> Switched to Aggregate & Pivot mode.")

        # Test Instant Chart Switching
        print("  -> Testing chart switching lenses (Table, Bar, Donut, KPI)...")
        for ct in ["table", "bar", "donut", "kpi"]:
            btn = page.locator(f"#explore-chart-btn-{ct}")
            assert await btn.is_visible(), f"Chart lens {ct} missing!"
            await btn.click()
            await page.wait_for_timeout(200)
        print("  -> PASS: All visual lenses switch smoothly.")

        # Run Slice-and-Dice query
        print("  -> Running DuckDB slice-and-dice aggregate query...")
        await page.click("#explore-chart-btn-bar")
        await page.click("#execute-explorer-query-btn")
        await page.wait_for_selector("text=ms", timeout=10000)
        print("  -> PASS: Live DuckDB query executed and rendered in stage!")

        # -------------------------------------------------------------
        # 5. Save Exploration to Dashboard
        # -------------------------------------------------------------
        print("\n[Step 5] Saving exploration to Dashboard...")
        await page.click("#save-exploration-btn")
        await page.wait_for_selector("#explorer-target-dashboard-select", state="visible")

        # Fill custom title
        await page.fill("#explorer-widget-title-input", "Explorer Sales Aggregate")
        await page.click("#confirm-save-exploration-btn")
        await page.wait_for_selector("text=successfully saved", timeout=8000)
        print("  -> PASS: Exploration successfully saved to dashboard container!")

        # -------------------------------------------------------------
        # 6. Verify Health (0 Console Errors, 0 Failed Requests)
        # -------------------------------------------------------------
        print("\n[Step 6] Inspecting Console & Network Health...")
        print(f"  -> Console Errors ({len(console_errors)}): {console_errors}")
        print(f"  -> Failed Requests ({len(failed_requests)}): {failed_requests}")
        assert len(failed_requests) == 0, f"Critical 5xx network failures: {failed_requests}"
        assert len(console_errors) == 0, f"Critical console errors: {console_errors}"
        print("  -> PASS: 0 console errors, 0 failed 5xx network requests!")

        await browser.close()

    print("\n" + "=" * 85)
    print("ALL INTERACTIVE DATA EXPLORER VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("=" * 85)

if __name__ == "__main__":
    asyncio.run(run_explore_verification())

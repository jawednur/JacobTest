from playwright.sync_api import Page, expect, sync_playwright

def verify_dashboard_connection(page: Page):
    # 1. Arrange: Go to the Dashboard page.
    page.goto("http://localhost:5173/dashboard")

    # 2. Act: Wait for the API response.
    # The dashboard initially shows "Loading..." then updates.
    # We want to confirm it updates to "Backend Status: Backend is connected!"

    # 3. Assert: Confirm the text is present.
    expect(page.get_by_text("Backend Status: Backend is connected!")).to_be_visible()

    # 4. Screenshot: Capture the final result.
    page.screenshot(path="/home/jules/verification/dashboard_connected.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_dashboard_connection(page)
        finally:
            browser.close()

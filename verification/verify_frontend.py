from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Login Page
        page.goto('http://localhost:5173/login')
        page.screenshot(path='verification/login_page.png')
        print("Login Page Screenshot taken")

        # 2. Login
        page.fill('input[type="text"]', 'admin')
        page.fill('input[type="password"]', 'admin')
        page.click('button[type="submit"]')

        # Wait for navigation to dashboard
        page.wait_for_url('http://localhost:5173/')
        page.wait_for_selector('h1:has-text("Dashboard")') # Ensure dashboard loaded

        # 3. Dashboard
        page.screenshot(path='verification/dashboard_page.png')
        print("Dashboard Page Screenshot taken")

        # 4. Items Page
        page.click('a[href="/items"]')
        page.wait_for_url('http://localhost:5173/items')
        page.wait_for_selector('h1:has-text("Inventory Items")')
        page.screenshot(path='verification/items_page.png')
        print("Items Page Screenshot taken")

        # 5. Profile Page
        page.click('a[href="/profile"]')
        page.wait_for_url('http://localhost:5173/profile')
        page.wait_for_selector('h1:has-text("User Profile")')
        page.screenshot(path='verification/profile_page.png')
        print("Profile Page Screenshot taken")

        browser.close()

if __name__ == "__main__":
    verify_frontend()

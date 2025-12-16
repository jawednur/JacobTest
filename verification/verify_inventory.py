from playwright.sync_api import sync_playwright

def verify_inventory_filters():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Login
        page.goto('http://localhost:5173/login')
        page.fill('input[type="text"]', 'admin')
        page.fill('input[type="password"]', 'admin')
        page.click('button[type="submit"]')
        page.wait_for_url('http://localhost:5173/')

        # 2. Go to Inventory
        page.click('a[href="/items"]')
        page.wait_for_url('http://localhost:5173/items')

        # 3. Create Items (Need multiple to test filtering/search if they don't exist,
        # but let's assume the previous manual testing or API calls populated some)
        # We can also rely on the "Test Item" created in previous session if persistence holds (sqlite3 file)

        # 4. Filter by Ingredient
        page.click('input[value="ingredient"]')
        page.wait_for_timeout(1000) # Wait for network
        page.screenshot(path='verification/inventory_filter_ingredient.png')
        print("Inventory Ingredient Filter Screenshot taken")

        # 5. Search
        page.fill('input[placeholder*="Search"]', 'Test')
        page.wait_for_timeout(1000)
        page.screenshot(path='verification/inventory_search.png')
        print("Inventory Search Screenshot taken")

        browser.close()

if __name__ == "__main__":
    verify_inventory_filters()

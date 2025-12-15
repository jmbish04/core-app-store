from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Go to app
    try:
        print("Navigating to http://localhost:8787...")
        response = page.goto("http://localhost:8787", timeout=10000)
        print(f"Status: {response.status}")
    except Exception as e:
        print(f"Error loading page: {e}")
        # Try waiting a bit more
        time.sleep(2)
        try:
             response = page.goto("http://localhost:8787", timeout=10000)
             print(f"Retry Status: {response.status}")
        except Exception as e2:
             print(f"Retry failed: {e2}")
             browser.close()
             return

    # Verify title
    try:
        print("Checking for title 'Core App Store'...")
        # Check for the title we set in HeroBlock
        # "Core App Store" is in a Badge
        expect(page.get_by_text("Core App Store")).to_be_visible(timeout=5000)
        print("Found title")
    except Exception as e:
        print(f"Title not found: {e}")
        page.screenshot(path="verification/debug_title_error.png")

    # Verify starred section
    try:
        print("Checking for 'Starred Apps'...")
        expect(page.get_by_text("Starred Apps")).to_be_visible(timeout=5000)
        print("Found Starred Apps section")
    except Exception as e:
        print(f"Starred apps not found: {e}")
        page.screenshot(path="verification/debug_starred_error.png")

    # Take screenshot
    print("Taking final screenshot...")
    page.screenshot(path="verification/app_store.png")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)

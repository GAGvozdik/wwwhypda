import requests
import time

BASE_URL = "http://localhost:5000/users"

def test_rate_limiting():
    print("--- Testing Rate Limiting (Login) ---")
    session = requests.Session()
    # Try 10 requests to /login (limit is 5 per minute)
    for i in range(10):
        response = session.post(f"{BASE_URL}/login", json={"email": "test@example.com", "password": "wrong-password", "recaptcha_token": "test-token"})
        print(f"Request {i+1}: Status {response.status_code}")
        if response.status_code == 429:
            print("SUCCESS: Rate limited!")
            return
        time.sleep(0.1)
    print("FAILURE: Not rate limited")

def test_csrf_rotation():
    print("\n--- Testing CSRF Rotation (Placeholder - Requires valid login) ---")
    # This part requires a valid user and bypassing reCAPTCHA if necessary.
    # In a real scenario, we would login, get cookies, then do a POST/PUT and check for new csrf_token cookie.
    print("To fully test CSRF rotation, ensure you have a valid user and a valid reCAPTCHA token (or TESTING=True).")

if __name__ == "__main__":
    try:
        # Check if server is up
        requests.get("http://localhost:5000", timeout=2)
        test_rate_limiting()
        test_csrf_rotation()
    except requests.exceptions.ConnectionError:
        print("ERROR: Server is not running on http://localhost:5000. Run mainApp.py first.")

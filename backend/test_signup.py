import requests
import json


def test_signup():
    url = "http://localhost:8000/signup"
    headers = {"Content-Type": "application/json"}

    # Use a random email to avoid collision (or handle 400)
    import random

    rand_id = random.randint(1000, 9999)
    data = {
        "email": f"testuser_{rand_id}@example.com",
        "password": "testpassword123",
        "full_name": "Test User",
    }

    print(f"Attempting signup with: {data['email']}")
    try:
        response = requests.post(url, json=data, headers=headers)
        print(f"Status Code: {response.status_code}")
        try:
            print(f"Response: {response.json()}")
        except:
            print(f"Response Text: {response.text}")

    except Exception as e:
        print(f"Request failed: {e}")


if __name__ == "__main__":
    test_signup()

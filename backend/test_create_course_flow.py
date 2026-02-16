import sys
import os
import time
from uuid import UUID

# Add backend to path
sys.path.append(os.getcwd())

from fastapi.testclient import TestClient
from app.main import app, get_current_active_admin
from app import models
from app.database import SessionLocal


def test_flow():
    print("Initializing TestClient...")

    # Override admin dependency
    mock_admin = models.User(
        id="00000000-0000-0000-0000-000000000000",
        email="admin@test.com",
        role="admin",
        is_active=True,
    )
    app.dependency_overrides[get_current_active_admin] = lambda: mock_admin

    client = TestClient(app)

    # Create course with video
    course_data = {
        "title": "Background Workflow Test - SDLC",
        "description": "Testing automated quiz generation on create.",
        "video_url": "https://youtu.be/5b36UTNRmtI",
    }

    print("Sending POST /api/courses/ ...")
    # Note: TestClient runs background tasks synchronously, so this will block until quiz is done.
    # This proves the logic works.
    response = client.post("/api/courses/", json=course_data)

    if response.status_code != 200:
        print(f"Failed: {response.status_code} {response.text}")
        return

    course_id = response.json()["id"]
    print(f"Course Created: {course_id}")

    # Check DB for quiz
    print("Checking database for quiz...")
    db = SessionLocal()
    try:
        # Loop briefly to simulated async delay if any (though TestClient is sync)
        for _ in range(5):
            quiz = (
                db.query(models.Quiz).filter(models.Quiz.course_id == course_id).first()
            )
            if quiz:
                print(f"SUCCESS: Quiz generated: '{quiz.title}'")
                print(f"Question Count: {len(quiz.questions)}")
                break
            time.sleep(1)
        else:
            print("FAILURE: No quiz found after creation.")

    finally:
        db.close()


if __name__ == "__main__":
    test_flow()

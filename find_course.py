import sys
import os

# Ensure backend directory is in path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database import SessionLocal
from app import crud, models


def find_target_course():
    db = SessionLocal()
    try:
        courses = db.query(models.Course).all()
        print(f"Scanned {len(courses)} courses.")
        target = None
        for c in courses:
            has_quiz = len(c.quizzes) > 0
            print(
                f"Course: '{c.title}' | Has Video: {bool(c.video_url)} | Has Quiz: {has_quiz}"
            )
            if c.video_url and not has_quiz:
                target = c
                # If multiple, maybe pick one? But "The video..." implies singular context.
                # I'll pick the first match.

        if target:
            print(f"\nTARGET IDENTIFIED: {target.id}")
            print(f"Title: {target.title}")
            print(f"Video URL: {target.video_url}")
        else:
            print("\nNo target course found (video present, quiz missing).")

    finally:
        db.close()


if __name__ == "__main__":
    find_target_course()

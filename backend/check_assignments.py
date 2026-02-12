from app.database import SessionLocal
from app import models, auth
import random


def check_and_fix_assignments():
    db = SessionLocal()
    email = "abc@gmail.com"
    print(f"Checking data for: {email}")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        print("User not found! Creating user...")
        user = models.User(
            email=email,
            full_name="ABC Learner",
            hashed_password=auth.get_password_hash("password"),
            role="learner",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Created user {email} with ID: {user.id}")
    else:
        print(f"User found: {user.id}")
        # Reset password to allow login
        user.hashed_password = auth.get_password_hash("password")
        user.is_active = True
        db.commit()
        print("Reset password to 'password'")

    # Check enrollments
    enrollments = (
        db.query(models.Enrollment).filter(models.Enrollment.user_id == user.id).all()
    )
    print(f"Enrollments found: {len(enrollments)}")

    if len(enrollments) == 0:
        print("No courses assigned. Assigning all available courses...")
        courses = db.query(models.Course).all()
        if not courses:
            print("No courses found in DB to assign!")
        else:
            for course in courses:
                print(f"Assigning '{course.title}' to user.")
                new_enrollment = models.Enrollment(user_id=user.id, course_id=course.id)
                # Also create progress entry as per crud
                new_progress = models.Progress(user_id=user.id, course_id=course.id)
                db.add(new_enrollment)
                db.add(new_progress)
            db.commit()
            print("Assignments created.")
    else:
        for e in enrollments:
            print(f" - Course ID: {e.course_id}")

    db.close()


if __name__ == "__main__":
    check_and_fix_assignments()

from app.database import SessionLocal
from app import crud, auth


def verify_login():
    db = SessionLocal()
    email = "abc@gmail.com"
    print(f"Checking login for: {email}")

    user = crud.get_user_by_email(db, email=email)
    if user:
        print(f"User found: {user.email}")
        test_pass = "password"
        is_valid = auth.verify_password(test_pass, user.hashed_password)
        print(f"Password '{test_pass}' Valid: {is_valid}")
    else:
        print("User not found")

    db.close()


if __name__ == "__main__":
    verify_login()

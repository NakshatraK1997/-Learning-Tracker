from app.database import SessionLocal
from app import crud, models, auth


def verify_login():
    db = SessionLocal()
    email = "admin@gmail.com"
    password = "admin_password"  # Need actual password if I knew it, but checking query execution is enough.

    print(f"Attempting to fetch user: {email}")
    try:
        # This matches the login route logic
        user = crud.get_user_by_email(db, email=email)

        if user:
            print(f"User found: {user.email}")
            print(f"ID: {user.id}")
            print(f"Created At: {user.created_at}")
            print(f"Hashed Password: {user.hashed_password}")

            # Verify we can read created_at
            if user.created_at is None:
                print("WARNING: created_at is None!")
            else:
                print("created_at is populated.")

        else:
            print("User not found (seed might not have run?)")

    except Exception as e:
        print(f"Query failed with error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    verify_login()

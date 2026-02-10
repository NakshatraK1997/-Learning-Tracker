from app.database import SessionLocal, engine
from app import models, auth
from sqlalchemy.orm import Session

# Create tables if they don't exist
models.Base.metadata.create_all(bind=engine)


def seed():
    db = SessionLocal()

    # Check if admin exists
    admin_email = "admin@gmail.com"  # Using email from screenshot
    existing_admin = (
        db.query(models.User).filter(models.User.email == admin_email).first()
    )
    hashed_password = auth.get_password_hash("password")  # Default password

    if not existing_admin:
        print(f"Creating admin user: {admin_email}")
        admin_user = models.User(
            email=admin_email,
            hashed_password=hashed_password,
            full_name="Admin User",
            role="admin",
            is_active=True,
        )
        db.add(admin_user)
        db.commit()
        print("Admin user created successfully!")
    else:
        print(f"Updating admin password for: {admin_email}")
        existing_admin.hashed_password = hashed_password
        db.commit()
        print("Admin password updated successfully!")

    # Check if learner exists
    learner_email = "learner@gmail.com"
    existing_learner = (
        db.query(models.User).filter(models.User.email == learner_email).first()
    )

    if not existing_learner:
        print(f"Creating learner user: {learner_email}")
        hashed_password = auth.get_password_hash("password")
        learner_user = models.User(
            email=learner_email,
            hashed_password=hashed_password,
            full_name="Learner User",
            role="learner",
            is_active=True,
        )
        db.add(learner_user)
        db.commit()
        print("Learner user created successfully!")

    db.close()


if __name__ == "__main__":
    seed()

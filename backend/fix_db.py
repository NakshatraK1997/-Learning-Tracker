from sqlalchemy import text
from app.database import SessionLocal, engine


def fix_schema():
    print("Attempting to add 'created_at' column to users table...")
    with engine.connect() as connection:
        try:
            # Transaction is auto-begun
            connection.execute(
                text(
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now()"
                )
            )
            connection.commit()
            print("Successfully added 'created_at' column.")
        except Exception as e:
            print(f"Migration error: {e}")
            # Try rolling back if needed, though 'with' usually handles cleanup


if __name__ == "__main__":
    fix_schema()

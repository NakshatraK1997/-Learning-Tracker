from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from app.database import engine


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
        except DBAPIError as e:
            print(f"Database error during migration: {e}")
        except Exception as e:
            print(f"Unexpected error: {e}")


if __name__ == "__main__":
    fix_schema()

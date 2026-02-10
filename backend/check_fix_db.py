from sqlalchemy import text
from app.database import engine


def check_fix_schema():
    print("Checking 'users' table columns...")
    with engine.connect() as connection:
        try:
            # Check if column exists
            result = connection.execute(
                text(
                    "SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='created_at';"
                )
            )
            exists = result.fetchone()

            if exists:
                print("'created_at' column EXISTS.")
            else:
                print(
                    "'created_at' column MISSING. Attempting to add with correct type..."
                )
                # The user requested TIMESTAMP WITH TIME ZONE
                connection.execute(
                    text(
                        "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"
                    )
                )
                connection.commit()
                print(
                    "Successfully added 'created_at' column (TIMESTAMP WITH TIME ZONE)."
                )

        except Exception as e:
            print(f"Migration error: {e}")


if __name__ == "__main__":
    check_fix_schema()

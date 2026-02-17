from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("DATABASE_URL not set")
    exit(1)

engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        print("Adding responses column to quiz_submissions...")
        # Using JSONB for Postgres, JSON for others if needed. Assuming Postgres as per context.
        query = text(
            "ALTER TABLE quiz_submissions ADD COLUMN IF NOT EXISTS responses JSONB;"
        )
        conn.execute(query)
        conn.commit()
        print("Done!")
except Exception as e:
    print(f"Error: {e}")

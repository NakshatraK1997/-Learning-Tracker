# Supabase PostgreSQL Migration Guide

## 1. Setup Database Connection

Your backend is now configured to check the `POSTGRES_URL` environment variable.

Create a `.env` file in `d:\\LMSS\\backend\\.env` with your Supabase connection string:

```
POSTGRES_URL="postgresql://postgres:[YOUR_PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

## 2. Apply Schema

Since we switched to UUIDs and SQLAlchemy, the application will automatically attempt to create tables if they don't exist. However, for a clean Supabase setup, you can run the following SQL commands in the **Supabase SQL Editor**:

```sql
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR,
    email VARCHAR UNIQUE,
    hashed_password VARCHAR,
    role VARCHAR DEFAULT 'learner',
    is_active BOOLEAN DEFAULT TRUE
);

-- Courses Table
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR,
    description TEXT,
    video_url VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Resources Table
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    file_name VARCHAR,
    file_size VARCHAR,
    file_url VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Quizzes Table
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR,
    questions JSONB
);

-- Quiz Submissions
CREATE TABLE quiz_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    score INTEGER,
    submitted_at TIMESTAMP DEFAULT NOW()
);

-- Enrollments
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW()
);

-- Progress
CREATE TABLE progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT FALSE,
    playback_position FLOAT DEFAULT 0.0,
    notes TEXT,
    last_updated TIMESTAMP DEFAULT NOW()
);
```

## 3. Restart Backend

Run your backend to ensure it connects successfully:

```bash
cd backend
python -m uvicorn app.main:app --reload
```

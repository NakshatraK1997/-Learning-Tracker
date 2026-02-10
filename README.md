# Learning Tracker System

A full-stack Learning Management System (LMS) for internal team training.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Python FastAPI, SQLAlchemy
- **Database**: SQLite (Local Dev) / PostgreSQL (Production)
- **Auth**: JWT Authentication

## Project Structure
```
/backend
  /app
    main.py       # API Entry point
    models.py     # Database Models
    schemas.py    # Pydantic Schemas
    auth.py       # JWT Logic
    crud.py       # Database Operations
/frontend
  /src
    /components   # Reusable UI
    /pages        # Application Views
    /context      # Auth State Management
```

## Setup & Run Locally

### 1. Backend Setup
Open a terminal and run:
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```
The API will start at `http://127.0.0.1:8000`.
API Documentation is available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup
Open a **new** terminal and run:
```bash
cd frontend
npm install
npm run dev
```
The web app will run at `http://localhost:5173`.

### 3. Usage
1.  Go to `http://localhost:5173`.
2.  Click **Sign up** to create an account.
    *   Select **Admin** role to create courses.
    *   Select **Learner** role to take courses.
3.  **Admin Flow**:
    *   Create a course (paste a YouTube embed URL like `https://www.youtube.com/embed/dQw4w9WgXcQ`).
    *   Assign the course to a Learner.
4.  **Learner Flow**:
    *   Log in as the Learner.
    *   See assigned courses on the Dashboard.
    *   Watch video and take notes.

## Features
*   **Authentication**: Secure JWT login/signup.
*   **Role-Based Access**: Admins manage content; Learners consume it.
*   **Progress Tracking**: Mark courses as complete and save personal notes.
*   **Video Embedding**: Support for YouTube and Vimeo.

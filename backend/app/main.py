from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import logging

from . import models, schemas, crud, database, auth

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()


@app.on_event("startup")
def startup_event():
    try:
        models.Base.metadata.create_all(bind=database.engine)
        logger.info("Database tables created successfully.")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Welcome to Learning Tracker API", "docs_url": "/docs"}


# New Simple Auth Dependency
def get_current_user_from_header(
    x_user_email: Optional[str] = Header(None), db: Session = Depends(database.get_db)
):
    if not x_user_email:
        # Fallback for open endpoints or strict mode?
        # For MVP admin actions, we might need this.
        # But let's allow None for login/signup, but raise for others.
        return None

    user = crud.get_user_by_email(db, email=x_user_email)
    if not user:
        raise HTTPException(status_code=400, detail="User header invalid")
    return user


def get_current_active_user(user: models.User = Depends(get_current_user_from_header)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


def get_current_active_admin(user: models.User = Depends(get_current_active_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return user


# ---- AUTH ENDPOINTS ----


@app.post("/api/login")
def login(
    data: schemas.LoginRequest, db: Session = Depends(database.get_db)
):  # Using LoginRequest schema
    # Check DB
    user = crud.get_user_by_email(db, email=data.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Check password (using auth utils)
    if not auth.verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name,
        "id": user.id,
    }


@app.post("/signup", response_model=schemas.User)
def signup(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)


# ---- COURSE ENDPOINTS ----


@app.post("/courses/", response_model=schemas.Course)
def create_course(
    course: schemas.CourseCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_admin),
):
    return crud.create_course(db=db, course=course)


@app.get("/courses/", response_model=List[schemas.Course])
def read_courses(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    # Allow learners to see all courses? Or just auth users?
    current_user: models.User = Depends(get_current_active_user),
):
    # In a real app, maybe filter active courses
    return crud.get_courses(db, skip=skip, limit=limit)


@app.get("/my-courses/", response_model=List[schemas.Course])
def read_learner_courses(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    return crud.get_learner_courses(db, user_id=current_user.id)


# ---- ASSIGNMENT ENDPOINTS ----


@app.post("/assignments/")
def assign_course_to_user(
    assignment: schemas.AssignCourse,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_admin),
):
    return crud.assign_course(
        db=db, user_id=assignment.user_id, course_id=assignment.course_id
    )


@app.get("/users/", response_model=List[schemas.User])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_admin),
):
    return db.query(models.User).offset(skip).limit(limit).all()


@app.get("/users/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_active_user)):
    return current_user


@app.put("/users/{user_id}", response_model=schemas.User)
def update_user(
    user_id: UUID,
    user_update: schemas.UserUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_admin),
):
    db_user = crud.update_user(db, user_id=user_id, user_update=user_update)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


# ---- PROGRESS ENDPOINTS ----


@app.get("/progress/{course_id}", response_model=schemas.Progress)
def read_progress(
    course_id: UUID,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    progress = crud.get_progress(db, user_id=current_user.id, course_id=course_id)
    if not progress:
        # If no progress exists but likely user is authorized (enrolled?), create empty or return 404
        # For simplicity, if they access it, create it?
        # Actually crud.get_progress assumes it exists from assignment.
        # Let's clean this up: if None, create default?
        progress = models.Progress(user_id=current_user.id, course_id=course_id)
        # We don't save it yet unless they interact? Or return standard 404?
        # Let's return 404 if not found (not assigned)
        raise HTTPException(
            status_code=404, detail="Course not assigned or progress not found"
        )
    return progress


@app.put("/progress/{course_id}", response_model=schemas.Progress)
def update_progress(
    course_id: UUID,
    progress_update: schemas.ProgressUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    updated = crud.update_progress(
        db, user_id=current_user.id, course_id=course_id, updates=progress_update
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Progress not found")
    return updated


# ---- QUIZ ENDPOINTS ----


@app.post("/quizzes/submit", response_model=schemas.QuizSubmission)
def submit_quiz(
    submission: schemas.QuizSubmissionCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    result = crud.submit_quiz(
        db,
        user_id=current_user.id,
        quiz_id=submission.quiz_id,
        answers=submission.answers,
    )
    if not result:
        raise HTTPException(status_code=400, detail="Quiz submission failed")
    return result


# ---- RESOURCE ENDPOINTS ----


@app.post("/courses/{course_id}/resources", response_model=schemas.Resource)
def create_resource(
    course_id: UUID,
    resource: schemas.ResourceCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_admin),
):
    resource.course_id = course_id  # Ensure alignment
    return crud.create_resource(db=db, resource=resource)


@app.get("/courses/{course_id}/resources", response_model=List[schemas.Resource])
def read_resources(
    course_id: UUID,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    return crud.get_resources(db, course_id=course_id)


# ---- REPORT ENDPOINTS ----


@app.get("/admin/reports", response_model=List[schemas.UserReportItem])
def get_admin_reports(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_admin),
):
    return crud.get_user_reports(db, skip=skip, limit=limit)


@app.get("/admin/recent-activity", response_model=List[schemas.User])
def get_recent_activity(
    limit: int = 5,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_admin),
):
    return crud.get_recent_activity(db, limit=limit)


# Validated schema and auth flow. created_at column confirmed to exist.

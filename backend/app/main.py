from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
import logging
import os
import tempfile

from . import models, schemas, crud, database, auth, utils
from .gemini_quiz import GeminiQuizGenerator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


app = FastAPI(debug=True)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error("Global exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
    )


@app.on_event("startup")
def startup_event():
    try:
        models.Base.metadata.create_all(bind=database.engine)
        logger.info("Database tables created successfully.")
    except Exception as e:
        logger.error("Error creating database tables: %s", e)


@app.on_event("shutdown")
def shutdown_event():
    logger.info("Shutting down Application")
    database.engine.dispose()
    logger.info("Database connection closed")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Welcome to Learning Tracker API", "docs_url": "/docs"}


def get_current_active_user(
    current_user: models.User = Depends(auth.get_current_user),
):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def get_current_active_admin(user: models.User = Depends(get_current_active_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return user


# ---- AUTH ENDPOINTS ----


@app.post("/api/login", response_model=schemas.LoginResponse)
def login(
    data: schemas.LoginRequest, db: Session = Depends(database.get_db)
):  # Using LoginRequest schema
    # Check DB
    user = crud.get_user_by_email(db, email=data.email)
    if not user:
        logger.warning("Login failed: User %s not found", data.email)
        # Don't reveal user existence
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check password (using auth utils)
    if not auth.verify_password(data.password, user.hashed_password):
        logger.warning("Login failed: Invalid password for user %s", data.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.info("User %s logged in successfully", data.email)
    access_token = auth.create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }


@app.post("/signup", response_model=schemas.User)
def signup(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    logger.info("Signup attempt for %s", user.email)
    try:
        db_user = crud.get_user_by_email(db, email=user.email)
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        new_user = crud.create_user(db=db, user=user)
        logger.info("User %s created successfully", user.email)
        return new_user
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error("Error during signup: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500, detail="Internal Server Error during signup"
        ) from e


# ---- COURSE ENDPOINTS ----


@app.post("/courses/", response_model=schemas.Course)
def create_course(
    course: schemas.CourseCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_admin),
):
    return crud.create_course(db=db, course=course)


@app.put("/courses/{course_id}", response_model=schemas.Course)
def update_course(
    course_id: UUID,
    course_update: schemas.CourseUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_admin),
):
    db_course = crud.update_course(db, course_id=course_id, course_update=course_update)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    return db_course


@app.get("/courses/{course_id}", response_model=schemas.Course)
def read_course(
    course_id: UUID,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    db_course = crud.get_course(db, course_id=course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    return db_course


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


@app.get("/users/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_active_user)):
    return current_user


@app.get("/api/user/stats")
def read_user_stats(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    return crud.get_user_quiz_stats(db, user_id=current_user.id)


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


@app.delete("/users/{user_id}", response_model=schemas.User)
def delete_user(
    user_id: UUID,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_admin),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    user_to_delete = db.query(models.User).filter(models.User.id == user_id).first()
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")

    if user_to_delete.role == "admin":
        raise HTTPException(
            status_code=403, detail="Cannot delete another administrator"
        )

    crud.delete_user(db, user_id=user_id)
    return user_to_delete


@app.get("/users/", response_model=List[schemas.User])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_admin),
):
    users = crud.get_users(db, skip=skip, limit=limit)
    return users


@app.get("/admin/reports", response_model=List[schemas.UserReportItem])
def read_admin_reports(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_admin),
):
    reports = crud.get_user_reports(db, skip=skip, limit=limit)
    return reports


@app.get("/admin/recent-activity", response_model=List[schemas.User])
def read_recent_activity(
    limit: int = 5,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_admin),
):
    return crud.get_recent_activity(db, limit=limit)


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


@app.delete("/courses/{course_id}", response_model=schemas.Course)
def delete_course(
    course_id: UUID,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_admin),
):
    course = crud.get_course(db, course_id=course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    crud.delete_course(db, course_id=course_id)
    return course


@app.delete("/resources/{resource_id}", response_model=schemas.Resource)
def delete_resource(
    resource_id: UUID,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_admin),
):
    # We don't have a direct get_resource in crud, but we can delete directly
    # Ideally should check existence first
    resource = (
        db.query(models.Resource).filter(models.Resource.id == resource_id).first()
    )
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    crud.delete_resource(db, resource_id=resource_id)
    return resource


# ---- REPORT ENDPOINTS ----


@app.get("/admin/reports/{user_id}", response_model=schemas.UserDetailedReport)
def get_user_detailed_report(
    user_id: UUID,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_admin),
):
    report = crud.get_user_report_details(db, user_id=user_id)
    if not report:
        raise HTTPException(status_code=404, detail="User not found")
    return report


# Validated schema and auth flow. created_at column confirmed to exist.


# ---- QUIZ GENERATION ENDPOINT ----


@app.post("/api/courses/{course_id}/generate-quiz")
async def generate_quiz_from_resource(
    course_id: UUID,
    file: UploadFile = File(...),
    num_questions: int = 25,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_admin),
):
    """
    Generate a quiz from an uploaded PDF resource using AI

    Args:
        course_id: UUID of the course
        file: Uploaded PDF file
        num_questions: Number of questions to generate (default: 25)

    Returns:
        Created quiz with generated questions
    """

    # Validate file type
    if not file.filename.endswith(".pdf"):
        raise HTTPException(
            status_code=400, detail="Only PDF files are supported for quiz generation"
        )

    # Verify course exists
    course = crud.get_course(db, course_id=course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        logger.info(f"Processing PDF: {file.filename} for course {course_id}")

        # Step 1: Extract text from PDF
        logger.info(f"Extracting text from PDF: {file.filename}")
        text_content = utils.extract_text_from_pdf_file(temp_file_path)

        # Clean up temp file
        os.unlink(temp_file_path)

        if not text_content or len(text_content) < 100:
            raise HTTPException(
                status_code=400, detail="Insufficient content extracted from the PDF"
            )

        # Step 2: Generate quiz using Gemini
        logger.info(f"Generating {num_questions} questions using Gemini 1.5 Flash...")
        quiz_gen = GeminiQuizGenerator()
        questions = quiz_gen.generate_quiz(text_content, num_questions=num_questions)

        if not questions:
            raise HTTPException(
                status_code=500, detail="Failed to generate questions from the PDF"
            )

        # Questions are already in the correct database format
        # Format: {"question": str, "options": [str], "answer": str}
        quiz_questions = questions

        # Create quiz in database
        quiz_title = f"Auto-Generated Quiz: {file.filename}"
        new_quiz = models.Quiz(
            course_id=course_id, title=quiz_title, questions=quiz_questions
        )

        db.add(new_quiz)
        db.commit()
        db.refresh(new_quiz)

        logger.info(f"Successfully created quiz with {len(quiz_questions)} questions")

        return {
            "message": "Quiz generated successfully",
            "quiz_id": new_quiz.id,
            "title": quiz_title,
            "num_questions": len(quiz_questions),
            "questions": quiz_questions,
        }

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating quiz: {e}", exc_info=True)
        # Clean up temp file if it exists
        if "temp_file_path" in locals() and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        raise HTTPException(
            status_code=500, detail=f"Failed to generate quiz: {str(e)}"
        )


@app.post("/api/generate-quiz/{course_id}")
async def generate_quiz_from_storage_resource(
    course_id: UUID,
    resource_id: UUID,
    num_questions: int = 25,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_admin),
):
    """
    Generate a quiz from an existing PDF resource stored in Supabase

    Args:
        course_id: UUID of the course
        resource_id: UUID of the resource (PDF) in the database
        num_questions: Number of questions to generate (default: 25)

    Returns:
        Created quiz with generated questions
    """

    # Verify course exists
    course = crud.get_course(db, course_id=course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Get the resource from database
    resource = (
        db.query(models.Resource)
        .filter(
            models.Resource.id == resource_id, models.Resource.course_id == course_id
        )
        .first()
    )

    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    # Validate it's a PDF
    if not resource.file_name.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF resources are supported for quiz generation",
        )

    try:
        logger.info(
            f"Generating quiz from resource: {resource.file_name} (ID: {resource_id})"
        )

        # Step 1: Extract text from PDF URL
        text_content = utils.extract_text_from_pdf_url(resource.file_url)

        # Step 2: Generate quiz using Gemini 1.5 Flash
        logger.info(f"Generating {num_questions} questions using Gemini 1.5 Flash...")
        quiz_gen = GeminiQuizGenerator()
        questions = quiz_gen.generate_quiz(text_content, num_questions=num_questions)

        if not questions:
            raise HTTPException(
                status_code=500, detail="Failed to generate questions from the PDF"
            )

        # Questions are already in the correct database format
        # Format: {"question": str, "options": [str], "answer": str}
        quiz_questions = questions

        # Create quiz in database
        quiz_title = f"Auto-Generated Quiz: {resource.file_name}"
        new_quiz = models.Quiz(
            course_id=course_id, title=quiz_title, questions=quiz_questions
        )

        db.add(new_quiz)
        db.commit()
        db.refresh(new_quiz)

        logger.info(f"Successfully created quiz with {len(quiz_questions)} questions")

        return {
            "message": "Quiz generated successfully",
            "quiz_id": str(new_quiz.id),
            "title": quiz_title,
            "num_questions": len(quiz_questions),
            "questions": quiz_questions,
        }

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating quiz: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to generate quiz: {str(e)}"
        )


@app.post("/api/courses/{course_id}/auto-generate-quiz")
async def auto_generate_quiz_for_course(
    course_id: UUID,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_admin),
):
    """
    Automatically generate a 25-question Knowledge Check quiz for a course
    Uses the first PDF resource found in the course

    Args:
        course_id: UUID of the course

    Returns:
        Created quiz with 25 generated questions
    """

    # Verify course exists
    course = crud.get_course(db, course_id=course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Find PDF resources for this course
    pdf_resources = (
        db.query(models.Resource)
        .filter(
            models.Resource.course_id == course_id,
            models.Resource.file_name.ilike("%.pdf"),
        )
        .all()
    )

    if not pdf_resources:
        raise HTTPException(
            status_code=404,
            detail="No PDF resources found for this course. Please upload a PDF resource first.",
        )

    # Use the first PDF resource
    resource = pdf_resources[0]

    try:
        logger.info(
            f"Auto-generating quiz for course {course_id} using resource: {resource.file_name}"
        )

        # Step 1: Extract text from PDF
        logger.info(f"Extracting text from PDF: {resource.file_url}")
        text_content = utils.extract_text_from_pdf_url(resource.file_url)

        # Step 2: Generate quiz using Gemini 1.5 Flash
        logger.info("Generating 25 questions using Gemini 1.5 Flash...")
        quiz_gen = GeminiQuizGenerator()
        questions = quiz_gen.generate_quiz(text_content, num_questions=25)

        if not questions or len(questions) == 0:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate questions from the PDF content",
            )

        # Step 3: Save to database
        quiz_title = f"Knowledge Check: {course.title}"
        new_quiz = models.Quiz(
            course_id=course_id, title=quiz_title, questions=questions
        )

        db.add(new_quiz)
        db.commit()
        db.refresh(new_quiz)

        logger.info(f"Successfully created quiz with {len(questions)} questions")

        return {
            "success": True,
            "message": "Quiz generated successfully",
            "quiz_id": str(new_quiz.id),
            "title": quiz_title,
            "num_questions": len(questions),
            "resource_used": resource.file_name,
            "questions": questions,
        }

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating quiz: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to generate quiz: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn

    # Hardcoded port 8000 as requested
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)

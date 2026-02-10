from sqlalchemy.orm import Session, joinedload
from uuid import UUID
from . import models, schemas, auth


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        role=user.role,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user(db: Session, user_id: UUID, user_update: schemas.UserUpdate):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        return None

    update_data = user_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)
    return db_user


def get_courses(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(models.Course)
        .options(joinedload(models.Course.quizzes))
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_course(db: Session, course: schemas.CourseCreate):
    db_course = models.Course(**course.dict())
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course


def assign_course(db: Session, user_id: UUID, course_id: UUID):
    existing = (
        db.query(models.Enrollment)
        .filter_by(user_id=user_id, course_id=course_id)
        .first()
    )
    if existing:
        return existing

    enrollment = models.Enrollment(user_id=user_id, course_id=course_id)
    progress = models.Progress(user_id=user_id, course_id=course_id)

    db.add(enrollment)
    db.add(progress)
    db.commit()
    return enrollment


def get_learner_courses(db: Session, user_id: UUID):
    return (
        db.query(models.Course)
        .join(models.Enrollment)
        .filter(models.Enrollment.user_id == user_id)
        .options(joinedload(models.Course.quizzes))
        .all()
    )


def get_progress(db: Session, user_id: UUID, course_id: UUID):
    return (
        db.query(models.Progress)
        .filter_by(user_id=user_id, course_id=course_id)
        .first()
    )


def update_progress(
    db: Session, user_id: UUID, course_id: UUID, updates: schemas.ProgressUpdate
):
    progress = get_progress(db, user_id, course_id)
    if not progress:
        return None

    progress.is_completed = updates.is_completed
    progress.playback_position = updates.playback_position
    progress.notes = updates.notes
    db.commit()
    db.refresh(progress)
    return progress


def create_quiz(db: Session, quiz: schemas.QuizCreate):
    db_quiz = models.Quiz(
        course_id=quiz.course_id,
        title=quiz.title,
        questions=quiz.questions,  # Stored as JSON
    )
    db.add(db_quiz)
    db.commit()
    db.refresh(db_quiz)
    return db_quiz


def submit_quiz(db: Session, user_id: UUID, quiz_id: UUID, answers: list[int]):
    quiz = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()
    if not quiz:
        return None

    score = 0
    total = len(quiz.questions)
    # Simple scoring logic
    for idx, question in enumerate(quiz.questions):
        if idx < len(answers):
            if answers[idx] == question["correct_index"]:
                score += 1

    percentage = int((score / total) * 100)

    submission = models.QuizSubmission(
        user_id=user_id, quiz_id=quiz_id, score=percentage
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


def create_resource(db: Session, resource: schemas.ResourceCreate):
    db_resource = models.Resource(**resource.dict())
    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    return db_resource


def get_resources(db: Session, course_id: UUID):
    return (
        db.query(models.Resource).filter(models.Resource.course_id == course_id).all()
    )


def get_user_reports(db: Session, skip: int = 0, limit: int = 100):
    # Query all users (learners) and their progress
    users = (
        db.query(models.User)
        .filter(models.User.role == "learner")
        .options(joinedload(models.User.progress))
        .offset(skip)
        .limit(limit)
        .all()
    )

    report_data = []

    for user in users:
        total_courses = len(
            user.progress
        )  # Correct way to count enrollments since progress is created on enrollment
        completed_courses = sum(1 for p in user.progress if p.is_completed)

        # Calculate completion percentage
        # Logic: (Sum of individual course progress) / total_courses
        # Each course progress is either 1.0 (completed) or playback_position (float 0-1)
        total_progress_sum = sum(
            1.0 if p.is_completed else (p.playback_position or 0.0)
            for p in user.progress
        )

        completion_percentage = 0.0
        if total_courses > 0:
            completion_percentage = (total_progress_sum / total_courses) * 100

        report_data.append(
            schemas.UserReportItem(
                user_id=user.id,
                full_name=user.full_name,
                email=user.email,
                courses_enrolled=total_courses,
                courses_completed=completed_courses,
                completion_percentage=round(completion_percentage, 1),
            )
        )

    return report_data


def get_recent_activity(db: Session, limit: int = 5):
    return (
        db.query(models.User)
        .filter(models.User.role == "learner")
        .order_by(models.User.created_at.desc())
        .limit(limit)
        .all()
    )

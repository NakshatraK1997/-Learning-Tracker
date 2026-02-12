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
        role="learner",  # Enforce learner role for all new signups
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

    # Security: Prevent promoting users to 'admin' via API to enforce single-admin rule
    if "role" in update_data and update_data["role"] == "admin":
        del update_data["role"]

    for key, value in update_data.items():
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()


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


def update_course(db: Session, course_id: UUID, course_update: schemas.CourseUpdate):
    db_course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not db_course:
        return None

    update_data = course_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_course, key, value)

    db.commit()
    db.refresh(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course


def get_course(db: Session, course_id: UUID):
    return (
        db.query(models.Course)
        .filter(models.Course.id == course_id)
        .options(joinedload(models.Course.quizzes))
        .first()
    )


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

    # Check if Score >= 70% (Passing)
    # If passed, mark the progress as completed
    # We need to find the related progress record.
    # We find the course_id from the quiz.
    if percentage >= 70:
        progress = (
            db.query(models.Progress)
            .filter(
                models.Progress.user_id == user_id,
                models.Progress.course_id == quiz.course_id,
            )
            .first()
        )
        if not progress:
            # If progress doesn't exist (edge case), create it as completed
            progress = models.Progress(
                user_id=user_id,
                course_id=quiz.course_id,
                is_completed=True,
                playback_position=1.0,  # Assume full progress if passed
            )
            db.add(progress)
        else:
            progress.is_completed = True
            # Optional: set playback to 1.0 if we want to sync visual bar

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


def delete_user(db: Session, user_id: UUID):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        db.delete(user)
        db.commit()
    return user


def delete_course(db: Session, course_id: UUID):
    db_course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if db_course:
        db.delete(db_course)
        db.commit()
    return db_course


def delete_resource(db: Session, resource_id: UUID):
    db_resource = (
        db.query(models.Resource).filter(models.Resource.id == resource_id).first()
    )
    if db_resource:
        db.delete(db_resource)
        db.commit()
    return db_resource

    return db_resource


def get_user_quiz_stats(db: Session, user_id: UUID):
    submissions = (
        db.query(models.QuizSubmission)
        .filter(models.QuizSubmission.user_id == user_id)
        .all()
    )
    if not submissions:
        return {"average_score": 0, "quizzes_taken": 0}

    avg_score = sum(s.score for s in submissions) / len(submissions)
    return {"average_score": round(avg_score, 1), "quizzes_taken": len(submissions)}


def get_user_report_details(db: Session, user_id: UUID):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return None

    # Get all enrollments for this user
    enrollments = (
        db.query(models.Enrollment).filter(models.Enrollment.user_id == user_id).all()
    )

    course_reports = []

    for enrollment in enrollments:
        course = (
            db.query(models.Course)
            .filter(models.Course.id == enrollment.course_id)
            .first()
        )
        if not course:
            continue

        # Get progress
        progress = (
            db.query(models.Progress)
            .filter(
                models.Progress.user_id == user_id,
                models.Progress.course_id == course.id,
            )
            .first()
        )

        # Get max quiz score for this course
        # Find quizzes for course
        quizzes = db.query(models.Quiz).filter(models.Quiz.course_id == course.id).all()
        quiz_ids = [q.id for q in quizzes]

        max_score = 0
        if quiz_ids:
            submissions = (
                db.query(models.QuizSubmission)
                .filter(
                    models.QuizSubmission.user_id == user_id,
                    models.QuizSubmission.quiz_id.in_(quiz_ids),
                )
                .all()
            )
            if submissions:
                max_score = max(s.score for s in submissions)

        video_status = "Not Started"
        is_completed = False

        if progress:
            is_completed = progress.is_completed
            if progress.playback_position > 0:
                video_status = "Started"
            # If completed, we can also say video status is "Watched" or just keep as Started?
            # User asked for "Video Status (Started/Not Started)".
            # I'll stick to simple logic.

        course_reports.append(
            schemas.CourseProgressReport(
                course_id=course.id,
                course_title=course.title,
                video_status=video_status,
                quiz_score=(
                    max_score if quiz_ids else None
                ),  # None if no quiz exists? Or 0? Schema says Optional[int]
                is_completed=is_completed,
            )
        )

    return schemas.UserDetailedReport(
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        courses=course_reports,
    )

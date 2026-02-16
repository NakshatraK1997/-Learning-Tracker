import sys
import os
import logging

# Add backend to path
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app import crud, models
from app.video_quiz import VideoQuizGenerator

# Setup logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("QuizUpgrader")


def upgrade_v2():
    db = SessionLocal()
    try:
        courses = db.query(models.Course).all()
        logger.info(f"Scanning {len(courses)} courses for legacy quiz formats...")

        # Initialize generator
        generator = VideoQuizGenerator()

        for course in courses:
            if not course.video_url:
                continue

            # Check existing quizzes
            # If multiple, check all? Or just active one?
            # We assume one per course for simplicity in this MVP logic
            if not course.quizzes:
                logger.info(
                    f"Course {course.title} has NO quiz. Generating standard v2..."
                )
                # Generate new
                process_course(db, generator, course)
                continue

            for quiz in course.quizzes:
                q_count = len(quiz.questions) if quiz.questions else 0
                if q_count != 15:
                    logger.info(
                        f"Course '{course.title}' has {q_count} questions (Legacy). Upgrading to 15 (v2.0)..."
                    )

                    # Delete old quiz
                    db.delete(quiz)
                    db.commit()
                    logger.info(f"Deleted legacy quiz {quiz.id}")

                    # Generate new
                    process_course(db, generator, course)
                else:
                    logger.info(
                        f"Course '{course.title}' already compliant (15 questions). Skipping."
                    )

    finally:
        db.close()


def process_course(db, generator, course):
    try:
        logger.info(f"Step A: Transcribing '{course.title}' ({course.video_url})...")
        transcript = generator.transcribe_video(course.video_url)

        logger.info(f"Step B: Generating 15-Question Quiz...")
        questions = generator.generate_quiz(transcript, course.title)

        if len(questions) != 15:
            logger.warning(
                f"Generated {len(questions)} questions. Asking for 15. Proceeding anyway."
            )

        logger.info(f"Step C: Saving {len(questions)} questions to DB...")
        new_quiz = models.Quiz(
            course_id=course.id,
            title=f"Video Quiz v2: {course.title}",
            questions=questions,
        )
        db.add(new_quiz)
        db.commit()
        db.refresh(new_quiz)
        logger.info(f"SUCCESS: v2 Quiz saved for '{course.title}'")

    except Exception as e:
        logger.error(f"FAILED to process '{course.title}': {e}")
        db.rollback()


if __name__ == "__main__":
    upgrade_v2()

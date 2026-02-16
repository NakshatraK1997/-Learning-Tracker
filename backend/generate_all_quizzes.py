import sys
import os
import logging

# Setup path to import app modules
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app import crud, models
from app.video_quiz import VideoQuizGenerator

# Setup logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("BatchQuizGenerator")


def generate_all():
    db = SessionLocal()
    try:
        # 1. Fetch all courses
        courses = db.query(models.Course).all()
        logger.info(f"Scanning {len(courses)} courses for missing quizzes...")

        pending_courses = []
        for course in courses:
            if not course.video_url:
                logger.debug(f"Skipping {course.title}: No video URL")
                continue

            # Check if quiz exists
            # course.quizzes is a relationship, returns list
            if not course.quizzes:
                pending_courses.append(course)

        logger.info(
            f"Found {len(pending_courses)} courses needing quizzes: {[c.title for c in pending_courses]}"
        )

        if not pending_courses:
            logger.info(
                "All applicable courses already have quizzes. No action needed."
            )
            return

        # Initialize Generator once
        generator = VideoQuizGenerator()

        # 2. Process Loop
        for i, course in enumerate(pending_courses, 1):
            logger.info(
                f"--- Processing {i}/{len(pending_courses)}: {course.title} ({course.id}) ---"
            )
            try:
                # A. Transcription
                logger.info(f"Step A: Transcribing video ({course.video_url})...")
                # This uses our robust method (Youtube download proxy or direct)
                transcript = generator.transcribe_video(course.video_url)
                logger.info(f"Transcription complete ({len(transcript)} chars).")

                # B. Quiz Generation
                logger.info("Step B: Generating Quiz with Gemini...")
                questions = generator.generate_quiz(transcript, course.title)
                logger.info(f"Generated {len(questions)} questions.")

                # C. Database Injection
                logger.info("Step C: Saving to Database...")
                quiz_title = f"Video Quiz: {course.title}"
                new_quiz = models.Quiz(
                    course_id=course.id, title=quiz_title, questions=questions
                )
                db.add(new_quiz)
                db.commit()
                db.refresh(new_quiz)
                logger.info(f"SUCCESS: Quiz saved and linked for {course.title}")

            except Exception as e:
                logger.error(f"FAILED to process {course.title}: {e}")
                db.rollback()

    finally:
        db.close()
        logger.info("Batch processing complete.")


if __name__ == "__main__":
    generate_all()

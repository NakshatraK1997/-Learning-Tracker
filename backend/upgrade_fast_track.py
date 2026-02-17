import sys
import os
import logging

sys.path.append(os.getcwd())
from app.database import SessionLocal
from app import crud, models
from app.video_quiz import VideoQuizGenerator

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("FastTrackQuiz")


def fast_track():
    db = SessionLocal()
    try:
        courses = db.query(models.Course).all()
        generator = VideoQuizGenerator()

        for course in courses:
            # Skip massive files for urgent sync
            if "java" in course.title.lower():
                logger.info("Skipping 'java' for fast track (too large).")
                continue

            if not course.video_url:
                continue

            needs_upgrade = False
            if not course.quizzes:
                logger.info(f"{course.title} has NO quiz. Scheduling generation.")
                needs_upgrade = True
            else:
                # Check for any non-compliant quiz
                for quiz in course.quizzes:
                    q_count = len(quiz.questions) if quiz.questions else 0
                    if q_count != 15:
                        logger.info(
                            f"Deleting {q_count}-question legacy quiz for {course.title}"
                        )
                        db.delete(quiz)
                        needs_upgrade = True

            if needs_upgrade:
                db.commit()  # Commit deletions

                logger.info(f"--- Processing {course.title} ---")
                try:
                    logger.info("Transcribing...")
                    transcript = generator.transcribe_video(course.video_url)

                    logger.info("Generating 15 questions...")
                    questions = generator.generate_quiz(transcript, course.title)

                    logger.info(f"Saving {len(questions)} questions...")
                    new_quiz = models.Quiz(
                        course_id=course.id,
                        title=f"Video Quiz v2: {course.title}",
                        questions=questions,
                    )
                    db.add(new_quiz)
                    db.commit()
                    logger.info(f"SUCCESS: {course.title} updated.")
                except Exception as e:
                    logger.error(f"Failed {course.title}: {e}")
                    db.rollback()
            else:
                logger.info(f"{course.title} is already v2 compliant (15 questions).")

    finally:
        db.close()
        logger.info("Fast Track Complete.")


if __name__ == "__main__":
    fast_track()

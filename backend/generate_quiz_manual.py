import sys
import os

# Ensure backend directory is in path
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app import crud, models
from app.video_quiz import VideoQuizGenerator


def generate():
    db = SessionLocal()
    course_id = "29c95cfc-d7fb-4949-b38c-f33af58728c0"
    try:
        course = crud.get_course(db, course_id=course_id)
        if not course:
            print("Course not found!")
            return

        print(f"Generating quiz for course: {course.title} ({course_id})")
        print(f"Video URL: {course.video_url}")

        generator = VideoQuizGenerator()

        print("Step 1: Transcribing video via AssemblyAI...")
        transcript = generator.transcribe_video(course.video_url)
        print(f"Transcription complete! Length: {len(transcript)} characters.")

        print("Step 2: Generating quiz questions via Gemini...")
        questions = generator.generate_quiz(transcript, course.title)
        print(f"Generated {len(questions)} questions.")

        print("Step 3: Saving to database...")
        quiz_title = f"Video Quiz: {course.title}"
        new_quiz = models.Quiz(
            course_id=course_id, title=quiz_title, questions=questions
        )
        db.add(new_quiz)
        db.commit()
        db.refresh(new_quiz)
        print(f"Success! Quiz saved with ID: {new_quiz.id}")
        print("Knowledge Check is now AVAILABLE.")

    except Exception as e:
        print(f"Error during generation: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    generate()

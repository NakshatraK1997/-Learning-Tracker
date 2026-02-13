"""
Automated quiz generation endpoint
Add this code to your main.py file before the 'if __name__ == "__main__":' line
"""

# Add this endpoint to main.py:


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

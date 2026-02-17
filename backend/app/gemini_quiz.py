"""
AI-powered quiz generation service using Google Gemini 1.5 Flash
Generates 25 multiple-choice questions from educational content
"""

import google.generativeai as genai
import json
import os
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


class GeminiQuizGenerator:
    """Generate quizzes using Google Gemini 1.5 Flash model"""

    def __init__(self, api_key: str = None):
        """
        Initialize the quiz generator with Gemini API

        Args:
            api_key: Gemini API key (defaults to environment variable)
        """
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")

        genai.configure(api_key=self.api_key)
        # Use Gemini 1.5 Flash for faster, cost-effective generation
        self.model = genai.GenerativeModel("gemini-1.5-flash")
        logger.info("Initialized Gemini 1.5 Flash model for quiz generation")

    def generate_quiz(self, text: str, num_questions: int = 25) -> List[Dict]:
        """
        Generate multiple-choice quiz questions from text content

        Args:
            text: Educational content to generate questions from
            num_questions: Number of questions to generate (default: 25)

        Returns:
            List of question dictionaries with format:
            [{"question": str, "options": [str], "answer": str}]
        """

        # Truncate if too long
        max_chars = 30000
        if len(text) > max_chars:
            logger.warning(
                f"Text too long ({len(text)} chars), truncating to {max_chars}"
            )
            text = text[:max_chars]

        prompt = self._create_prompt(text, num_questions)

        try:
            logger.info(
                f"Generating {num_questions} quiz questions using Gemini 1.5 Flash..."
            )

            # Generate content with Gemini
            response = self.model.generate_content(prompt)

            # Parse and validate response
            questions = self._parse_response(response.text)

            # Ensure we have the right number of questions
            if len(questions) < num_questions:
                logger.warning(
                    f"Generated only {len(questions)} questions instead of {num_questions}"
                )

            # Return exactly num_questions
            result = questions[:num_questions]
            logger.info(f"Successfully generated {len(result)} validated questions")

            return result

        except Exception as e:
            logger.error(f"Error generating quiz: {e}", exc_info=True)
            raise ValueError(f"Failed to generate quiz: {str(e)}")

    def _create_prompt(self, text: str, num_questions: int) -> str:
        """Create the prompt for Gemini AI"""

        prompt = f"""Based on this text, generate exactly {num_questions} multiple-choice questions in JSON format.

TEXT:
{text}

REQUIREMENTS:
1. Generate exactly {num_questions} questions
2. Each question must have exactly 4 options labeled A, B, C, D
3. Questions should test understanding and comprehension
4. Cover different topics from the text
5. Only ONE option should be correct
6. The "answer" field must contain only the letter (A, B, C, or D)
7. Make incorrect options plausible but clearly wrong

OUTPUT FORMAT (pure JSON array, no markdown, no code blocks):
[
  {{
    "question": "What is the main concept of...",
    "options": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option"],
    "answer": "A"
  }},
  {{
    "question": "Which of the following...",
    "options": ["A) Option one", "B) Option two", "C) Option three", "D) Option four"],
    "answer": "C"
  }}
]

CRITICAL RULES:
- Return ONLY the JSON array, no additional text
- No markdown formatting, no code blocks
- Each option must start with its letter: A), B), C), D)
- The "answer" field contains only the letter
- Questions must be based on the provided text

Generate the {num_questions} questions now:"""

        return prompt

    def _parse_response(self, response_text: str) -> List[Dict]:
        """Parse and validate Gemini's response"""

        try:
            # Clean up response
            response_text = response_text.strip()

            # Remove markdown code blocks if present
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            elif response_text.startswith("```"):
                response_text = response_text[3:]

            if response_text.endswith("```"):
                response_text = response_text[:-3]

            response_text = response_text.strip()

            # Parse JSON
            questions = json.loads(response_text)

            if not isinstance(questions, list):
                raise ValueError("Response is not a JSON array")

            # Validate each question
            validated = []
            for q in questions:
                if self._validate_question(q):
                    validated.append(q)
                else:
                    logger.warning(
                        f"Skipping invalid question: {q.get('question', 'Unknown')}"
                    )

            return validated

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            logger.error(f"Response: {response_text[:500]}")
            raise ValueError("AI response is not valid JSON")

    def _validate_question(self, question: Dict) -> bool:
        """Validate a single question structure"""

        # Check required fields
        if not all(key in question for key in ["question", "options", "answer"]):
            return False

        # Validate question text
        if (
            not isinstance(question["question"], str)
            or not question["question"].strip()
        ):
            return False

        # Validate options
        if not isinstance(question["options"], list) or len(question["options"]) != 4:
            return False

        # Validate all options are strings
        if not all(isinstance(opt, str) for opt in question["options"]):
            return False

        # Validate answer
        answer = question["answer"].upper().strip()
        if answer not in ["A", "B", "C", "D"]:
            return False

        # Normalize answer to uppercase
        question["answer"] = answer

        return True

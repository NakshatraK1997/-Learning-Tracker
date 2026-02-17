"""
Enhanced Quiz Generation Service with Supabase Storage Integration
Fetches PDFs from Supabase storage and generates quizzes
"""

import fitz  # PyMuPDF
import google.generativeai as genai
import json
import os
import requests
import tempfile
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


class QuizGeneratorFromStorage:
    def __init__(self, api_key: str = None):
        """Initialize the quiz generator with Gemini API"""
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")

        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel("gemini-pro")

    def download_pdf_from_url(self, url: str) -> str:
        """
        Download PDF from Supabase storage URL to temporary file

        Args:
            url: Public URL of the PDF in Supabase storage

        Returns:
            Path to the downloaded temporary file
        """
        try:
            logger.info(f"Downloading PDF from: {url}")
            response = requests.get(url, timeout=30)
            response.raise_for_status()

            # Create temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
            temp_file.write(response.content)
            temp_file.close()

            logger.info(f"PDF downloaded to: {temp_file.name}")
            return temp_file.name

        except requests.RequestException as e:
            logger.error(f"Error downloading PDF: {e}")
            raise ValueError(f"Failed to download PDF from URL: {str(e)}")

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """
        Extract text content from a PDF file using PyMuPDF

        Args:
            pdf_path: Path to the PDF file

        Returns:
            Extracted text as a string
        """
        try:
            doc = fitz.open(pdf_path)
            text_content = ""

            for page_num in range(len(doc)):
                page = doc[page_num]
                text_content += page.get_text()

            doc.close()

            # Clean up the text
            text_content = text_content.strip()

            logger.info(f"Extracted {len(text_content)} characters from PDF")
            return text_content

        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            raise

    def generate_quiz_questions(
        self, content: str, num_questions: int = 25, difficulty: str = "mixed"
    ) -> List[Dict]:
        """
        Generate multiple-choice quiz questions using Gemini AI

        Args:
            content: The text content to generate questions from
            num_questions: Number of questions to generate (default: 25)
            difficulty: Difficulty level - "easy", "medium", "hard", or "mixed"

        Returns:
            List of question dictionaries with format:
            [{"question": str, "options": [str], "answer": str}]
        """

        # Truncate content if too long (Gemini has token limits)
        max_chars = 30000
        if len(content) > max_chars:
            logger.warning(
                f"Content too long ({len(content)} chars), truncating to {max_chars}"
            )
            content = content[:max_chars]

        prompt = self._create_quiz_prompt(content, num_questions, difficulty)

        try:
            logger.info(f"Generating {num_questions} quiz questions using Gemini AI...")

            response = self.model.generate_content(prompt)

            # Parse the JSON response
            questions = self._parse_gemini_response(response.text)

            # Validate we got the right number of questions
            if len(questions) < num_questions:
                logger.warning(
                    f"Generated only {len(questions)} questions instead of {num_questions}"
                )

            logger.info(f"Successfully generated {len(questions)} questions")
            return questions[:num_questions]  # Ensure we return exactly num_questions

        except Exception as e:
            logger.error(f"Error generating quiz questions: {e}")
            raise

    def _create_quiz_prompt(
        self, content: str, num_questions: int, difficulty: str
    ) -> str:
        """Create the prompt for Gemini AI with strict output format"""

        prompt = f"""You are an expert educational content creator. Based on the following educational content, generate exactly {num_questions} high-quality multiple-choice questions.

CONTENT:
{content}

REQUIREMENTS:
1. Generate exactly {num_questions} questions
2. Each question must have exactly 4 options labeled A, B, C, D
3. Questions should test understanding, not just memorization
4. Difficulty level: {difficulty}
5. Cover different topics from the content
6. Ensure only ONE option is correct for each question
7. Make distractors (wrong answers) plausible but clearly incorrect
8. The "answer" field must be the letter of the correct option (A, B, C, or D)

OUTPUT FORMAT (JSON only, no markdown, no code blocks):
[
  {{
    "question": "What is the main purpose of...",
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
- Return ONLY valid JSON array, no additional text, no markdown, no code blocks
- Each option must start with its letter (A), B), C), D))
- The "answer" field must contain only the letter (A, B, C, or D)
- Questions should be clear and unambiguous
- Avoid questions that require external knowledge not in the content

Generate the {num_questions} questions now in pure JSON format:"""

        return prompt

    def _parse_gemini_response(self, response_text: str) -> List[Dict]:
        """Parse Gemini's response and extract questions"""

        try:
            # Remove markdown code blocks if present
            response_text = response_text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]

            response_text = response_text.strip()

            # Parse JSON
            questions = json.loads(response_text)

            # Validate structure
            validated_questions = []
            for q in questions:
                if self._validate_question(q):
                    validated_questions.append(q)
                else:
                    logger.warning(f"Skipping invalid question: {q}")

            return validated_questions

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            logger.error(f"Response text: {response_text[:500]}")
            raise ValueError("Failed to parse AI response as JSON")

    def _validate_question(self, question: Dict) -> bool:
        """Validate a single question structure"""

        required_keys = ["question", "options", "answer"]

        # Check all required keys exist
        if not all(key in question for key in required_keys):
            return False

        # Validate options is a list of 4 strings
        if not isinstance(question["options"], list) or len(question["options"]) != 4:
            return False

        # Validate answer is a single letter A, B, C, or D
        if not isinstance(question["answer"], str) or question[
            "answer"
        ].upper() not in ["A", "B", "C", "D"]:
            return False

        # Validate question is a non-empty string
        if (
            not isinstance(question["question"], str)
            or not question["question"].strip()
        ):
            return False

        return True

    def generate_quiz_from_url(
        self, pdf_url: str, num_questions: int = 25, difficulty: str = "mixed"
    ) -> List[Dict]:
        """
        Complete workflow: Download PDF from URL, extract text, and generate quiz

        Args:
            pdf_url: Public URL of the PDF in Supabase storage
            num_questions: Number of questions to generate
            difficulty: Difficulty level

        Returns:
            List of generated questions
        """

        temp_file_path = None

        try:
            # Step 1: Download PDF from URL
            temp_file_path = self.download_pdf_from_url(pdf_url)

            # Step 2: Extract text from PDF
            logger.info(f"Extracting text from downloaded PDF")
            content = self.extract_text_from_pdf(temp_file_path)

            if not content or len(content) < 100:
                raise ValueError("Insufficient content extracted from PDF")

            # Step 3: Generate questions
            logger.info("Generating quiz questions from extracted content")
            questions = self.generate_quiz_questions(content, num_questions, difficulty)

            return questions

        finally:
            # Clean up temporary file
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                    logger.info(f"Cleaned up temporary file: {temp_file_path}")
                except Exception as e:
                    logger.warning(f"Failed to clean up temp file: {e}")

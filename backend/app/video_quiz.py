import assemblyai as aai
import google.generativeai as genai
import os
import logging

logger = logging.getLogger(__name__)


class VideoQuizGenerator:
    def __init__(self):
        self.assemblyai_key = os.getenv("ASSEMBLYAI_API_KEY")
        self.gemini_key = os.getenv("GEMINI_API_KEY")

        if not self.assemblyai_key:
            logger.warning("ASSEMBLYAI_API_KEY not set")
        else:
            aai.settings.api_key = self.assemblyai_key

        if not self.gemini_key:
            logger.warning("GEMINI_API_KEY not set")
        else:
            genai.configure(api_key=self.gemini_key)
            self.model = genai.GenerativeModel("gemini-2.5-flash")

    def transcribe_video(self, file_path_or_url: str) -> str:
        """Transcribes video/audio using AssemblyAI."""
        if not self.assemblyai_key:
            raise ValueError("AssemblyAI API key not found")

        local_cleanup_needed = False

        # Handle YouTube URLs
        if "youtube.com" in file_path_or_url or "youtu.be" in file_path_or_url:
            logger.info("Detected YouTube URL. Downloading audio locally...")
            try:
                import yt_dlp
                import tempfile
                import uuid

                # Create unique temp filename base (without extension yet)
                temp_file_base = os.path.join(
                    tempfile.gettempdir(), f"yt_{uuid.uuid4()}"
                )

                ydl_opts = {
                    "format": "bestaudio/best",
                    "outtmpl": f"{temp_file_base}.%(ext)s",
                    "quiet": True,
                    "noplaylist": True,
                }

                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(file_path_or_url, download=True)
                    # Determine the actual filename
                    if "requested_downloads" in info:
                        downloaded_path = info["requested_downloads"][0]["filepath"]
                    else:
                        downloaded_path = ydl.prepare_filename(info)

                    file_path_or_url = downloaded_path
                    local_cleanup_needed = True
                    logger.info(f"Downloaded locally to: {downloaded_path}")

            except Exception as e:
                logger.error(f"Failed to download YouTube audio: {e}")
                raise e

        logger.info(f"Starting transcription for: {file_path_or_url}")
        transcriber = aai.Transcriber()
        # Using universal-2 as required by API key
        config = aai.TranscriptionConfig(speech_models=["universal-2"])

        try:
            transcript = transcriber.transcribe(file_path_or_url, config=config)
        except Exception as e:
            logger.error(f"Transcription failed during API call: {e}")
            raise e
        finally:
            if local_cleanup_needed and os.path.exists(file_path_or_url):
                try:
                    os.remove(file_path_or_url)
                    logger.info("Cleaned up temp audio file.")
                except Exception as cleanup_error:
                    logger.warning(f"Failed to cleanup temp file: {cleanup_error}")

        if transcript.status == aai.TranscriptStatus.error:
            logger.error(f"Transcription failed: {transcript.error}")
            raise Exception(f"Transcription failed: {transcript.error}")

        logger.info("Transcription completed successfully")
        return transcript.text

    def generate_quiz(self, transcript_text: str, course_name: str) -> list[dict]:
        """Generates a 25-question quiz in JSON format using Gemini."""
        if not self.gemini_key:
            raise ValueError("Gemini API key not found")

        import json

        prompt = f"""
        Act as an Academic Content Engineer (v2.0).
        Your objective is to process the video transcript and produce a concise course assessment.
        
        Rules:
        1. Create exactly 15 Multiple Choice Questions (MCQs).
        2. Format: 4 options (A, B, C, D) per question with 1 correct answer.
        3. Coverage: Ensure the 15 questions are distributed evenly across the video content (beginning, middle, and end).
        4. Focus: Foundational concepts to advanced applications.
        
        Transcript:
        {transcript_text}

        Output must be a JSON array of objects. Each object should have:
        - "question": string
        - "options": list of 4 strings (e.g. ["A) Option 1", "B) Option 2", ...])
        - "correct_answer": string (e.g. "A", "B", "C", or "D")
        - "explanation": string
        """

        logger.info("Sending prompt to Gemini...")
        response = self.model.generate_content(
            prompt, generation_config={"response_mime_type": "application/json"}
        )
        logger.info("Quiz generation completed")

        try:
            # Strip markdown formatting
            raw_text = response.text.replace("```json", "").replace("```", "").strip()
            questions = json.loads(raw_text)

            # Normalize to match DB schema
            normalized_questions = []
            for q in questions:
                # Handle correct_answer being index or letter
                c_answer = q.get("correct_answer", "").upper().replace(".", "").strip()
                c_index = 0
                if "B" in c_answer:
                    c_index = 1
                elif "C" in c_answer:
                    c_index = 2
                elif "D" in c_answer:
                    c_index = 3

                normalized_questions.append(
                    {
                        "question": q["question"],
                        "options": q["options"],
                        "correct_index": c_index,
                        "explanation": q.get("explanation", ""),
                    }
                )

            return normalized_questions

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            raise ValueError("Gemini failed to return valid JSON")

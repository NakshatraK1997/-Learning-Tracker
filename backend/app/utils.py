"""
Utility functions for the Learning Tracker LMS
Includes PDF text extraction and other helper functions
"""

import fitz  # PyMuPDF
import requests
import tempfile
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def extract_text_from_pdf_url(pdf_url: str) -> str:
    """
    Extract text from a PDF file stored in Supabase storage

    Args:
        pdf_url: Public URL of the PDF in Supabase storage

    Returns:
        Extracted text as a string

    Raises:
        ValueError: If PDF cannot be downloaded or text cannot be extracted
    """
    temp_file_path = None

    try:
        # Download PDF from URL
        logger.info(f"Downloading PDF from: {pdf_url}")
        response = requests.get(pdf_url, timeout=30)
        response.raise_for_status()

        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_file.write(response.content)
            temp_file_path = temp_file.name

        logger.info(f"PDF downloaded to temporary file: {temp_file_path}")

        # Extract text using PyMuPDF
        doc = fitz.open(temp_file_path)
        text_content = ""

        for page_num in range(len(doc)):
            page = doc[page_num]
            text_content += page.get_text()

        doc.close()

        # Clean up text
        text_content = text_content.strip()

        logger.info(f"Extracted {len(text_content)} characters from PDF")

        if len(text_content) < 100:
            raise ValueError(
                "Insufficient text content extracted from PDF (minimum 100 characters required)"
            )

        return text_content

    except requests.RequestException as e:
        logger.error(f"Error downloading PDF: {e}")
        raise ValueError(f"Failed to download PDF from URL: {str(e)}")
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                logger.info(f"Cleaned up temporary file: {temp_file_path}")
            except Exception as e:
                logger.warning(f"Failed to clean up temporary file: {e}")


def extract_text_from_pdf_file(pdf_path: str) -> str:
    """
    Extract text from a local PDF file

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

        text_content = text_content.strip()
        logger.info(f"Extracted {len(text_content)} characters from local PDF")

        return text_content

    except Exception as e:
        logger.error(f"Error extracting text from local PDF: {e}")
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")


def truncate_text(text: str, max_chars: int = 30000) -> str:
    """
    Truncate text to a maximum number of characters
    Useful for API token limits

    Args:
        text: Text to truncate
        max_chars: Maximum number of characters

    Returns:
        Truncated text
    """
    if len(text) <= max_chars:
        return text

    logger.warning(f"Truncating text from {len(text)} to {max_chars} characters")
    return text[:max_chars]


def validate_pdf_url(url: str) -> bool:
    """
    Validate if a URL points to a PDF file

    Args:
        url: URL to validate

    Returns:
        True if URL appears to be a PDF, False otherwise
    """
    if not url:
        return False

    # Check if URL ends with .pdf
    if url.lower().endswith(".pdf"):
        return True

    # Check if URL contains .pdf in the path
    if ".pdf" in url.lower():
        return True

    return False

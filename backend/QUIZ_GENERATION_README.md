# Automated Quiz Generation System

## Overview
This system automatically generates high-quality multiple-choice quizzes from PDF resources using Google Gemini AI.

## Features
- ✅ Extract text from PDF files using PyMuPDF
- ✅ Generate 25 intelligent MCQ questions using Gemini AI
- ✅ Validate question quality and structure
- ✅ Save quizzes to Supabase database
- ✅ Admin-only access with JWT authentication

## Setup Instructions

### 1. Get Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy your API key

### 2. Update Environment Variables
Edit `backend/.env` and add your Gemini API key:
```bash
GEMINI_API_KEY=your-actual-gemini-api-key-here
```

### 3. Dependencies (Already Installed)
```bash
pip install PyMuPDF google-generativeai python-multipart
```

## API Endpoint

### POST `/api/courses/{course_id}/generate-quiz`

**Description:** Generate a quiz from an uploaded PDF resource

**Authentication:** Admin only (JWT token required)

**Parameters:**
- `course_id` (path): UUID of the course
- `file` (form-data): PDF file to process
- `num_questions` (query, optional): Number of questions (default: 25)

**Request Example:**
```bash
curl -X POST "http://localhost:8000/api/courses/{course_id}/generate-quiz?num_questions=25" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@python_notes.pdf"
```

**Response Example:**
```json
{
  "message": "Quiz generated successfully",
  "quiz_id": "uuid-here",
  "title": "Auto-Generated Quiz: python_notes.pdf",
  "num_questions": 25,
  "questions": [
    {
      "question": "What is the main purpose of Python's GIL?",
      "options": [
        "To prevent race conditions",
        "To improve performance",
        "To enable multithreading",
        "To manage memory"
      ],
      "correct_index": 0
    }
  ]
}
```

## How It Works

### 1. PDF Text Extraction
```python
# Uses PyMuPDF (fitz) to extract text
doc = fitz.open(pdf_path)
text_content = ""
for page in doc:
    text_content += page.get_text()
```

### 2. AI Question Generation
The system uses a carefully crafted prompt to ensure high-quality questions:

**Prompt Template:**
```
You are an expert educational content creator. Based on the following educational content, 
generate exactly 25 high-quality multiple-choice questions.

REQUIREMENTS:
1. Generate exactly 25 questions
2. Each question must have exactly 4 options (A, B, C, D)
3. Questions should test understanding, not just memorization
4. Difficulty level: mixed
5. Cover different topics from the content
6. Ensure only ONE option is correct for each question
7. Make distractors (wrong answers) plausible but clearly incorrect

OUTPUT FORMAT (JSON only, no markdown):
[
  {
    "question": "What is...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_index": 0
  }
]
```

### 3. Validation
Each generated question is validated for:
- ✅ Correct JSON structure
- ✅ Exactly 4 options
- ✅ Valid correct_index (0-3)
- ✅ Non-empty question text

### 4. Database Storage
Questions are stored in the `quizzes` table with:
- `id`: UUID
- `course_id`: Foreign key to courses
- `title`: Auto-generated title
- `questions`: JSON array of question objects

## Usage Example

### Admin Dashboard - Generate Quiz Button

```javascript
// Frontend code example
const handleGenerateQuiz = async (courseId, pdfFile) => {
  const formData = new FormData();
  formData.append('file', pdfFile);
  
  const response = await fetch(
    `http://localhost:8000/api/courses/${courseId}/generate-quiz?num_questions=25`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    }
  );
  
  const result = await response.json();
  console.log(`Generated ${result.num_questions} questions!`);
};
```

## File Structure

```
backend/
├── app/
│   ├── quiz_generator.py      # Quiz generation service
│   ├── main.py                # FastAPI endpoints
│   ├── models.py              # Database models
│   └── crud.py                # Database operations
└── .env                       # Environment variables
```

## Error Handling

The system handles various error scenarios:

1. **Invalid File Type**
   - Status: 400
   - Message: "Only PDF files are supported"

2. **Course Not Found**
   - Status: 404
   - Message: "Course not found"

3. **Insufficient Content**
   - Status: 400
   - Message: "Insufficient content extracted from PDF"

4. **AI Generation Failure**
   - Status: 500
   - Message: "Failed to generate quiz: [error details]"

5. **Missing API Key**
   - Status: 500
   - Message: "GEMINI_API_KEY not found in environment variables"

## Best Practices

### Content Quality
- ✅ Use PDFs with clear, well-structured text
- ✅ Avoid scanned images (OCR not supported)
- ✅ Ensure content is educational and factual
- ✅ Minimum 100 characters of content required

### Question Quality
- Questions test understanding, not memorization
- Distractors are plausible but clearly incorrect
- Mixed difficulty levels (easy, medium, hard)
- Cover different topics from the content

### Performance
- PDF processing: ~5-10 seconds
- AI generation: ~10-30 seconds (depends on content length)
- Total time: ~15-40 seconds per quiz

## Troubleshooting

### Issue: "GEMINI_API_KEY not found"
**Solution:** Add your Gemini API key to `.env` file

### Issue: "Failed to parse JSON response"
**Solution:** Check Gemini API rate limits and try again

### Issue: "Insufficient content extracted"
**Solution:** Ensure PDF has readable text (not scanned images)

### Issue: "Only generated X questions instead of 25"
**Solution:** Content may be too short. System will generate as many as possible.

## Future Enhancements

- [ ] Support for other file formats (DOCX, TXT)
- [ ] OCR support for scanned PDFs
- [ ] Custom difficulty levels per question
- [ ] Question categorization by topic
- [ ] Bulk quiz generation
- [ ] Question review and editing interface

## Security Notes

- ⚠️ Endpoint requires admin authentication
- ⚠️ File size limits should be configured
- ⚠️ Temporary files are automatically cleaned up
- ⚠️ API key should never be committed to version control

## License
MIT License - See LICENSE file for details

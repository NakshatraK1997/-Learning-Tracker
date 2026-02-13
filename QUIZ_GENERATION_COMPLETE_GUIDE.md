# 🎓 Automated Quiz Generation from Supabase Resources - Complete Guide

## ✅ What Has Been Implemented

### System Overview
Your LMS now has a fully automated quiz generation system that:
1. Fetches PDF resources from Supabase storage
2. Extracts text using PyMuPDF
3. Generates 25 MCQ questions using Google Gemini AI
4. Saves quizzes directly to your Supabase database
5. Displays quizzes in the KnowledgeCheck component

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Admin Dashboard                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  QuizGeneratorFromResource Component                  │  │
│  │  - Dropdown: Select PDF resource                      │  │
│  │  - Button: "Generate 25 AI Questions"                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              POST /api/generate-quiz/{course_id}             │
│              Query Param: resource_id                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│          QuizGeneratorFromStorage Service                    │
│  1. Fetch resource from database                            │
│  2. Download PDF from Supabase storage URL                  │
│  3. Extract text with PyMuPDF                               │
│  4. Send to Gemini AI with prompt                           │
│  5. Parse and validate 25 questions                         │
│  6. Save to Supabase quizzes table                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supabase Database                           │
│  quizzes table:                                              │
│  - id (UUID)                                                 │
│  - course_id (UUID)                                          │
│  - title (string)                                            │
│  - questions (JSON array)                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Files Created/Modified

### Backend Files

#### ✅ NEW: `backend/app/quiz_generator.py`
**QuizGeneratorFromStorage Class**
- `download_pdf_from_url(url)` - Downloads PDF from Supabase storage
- `extract_text_from_pdf(pdf_path)` - Extracts text using PyMuPDF
- `generate_quiz_questions(content, num_questions=25)` - Calls Gemini AI
- `generate_quiz_from_url(pdf_url, num_questions=25)` - Complete workflow

#### ✅ UPDATED: `backend/app/main.py`
**New Endpoint:**
```python
POST /api/generate-quiz/{course_id}
Query Parameters:
  - resource_id: UUID (required)
  - num_questions: int (optional, default=25)
Headers:
  - Authorization: Bearer {JWT_TOKEN}
```

#### ✅ UPDATED: `backend/.env`
```bash
GEMINI_API_KEY=your-gemini-api-key-here
```

### Frontend Files

#### ✅ NEW: `frontend/src/components/QuizGenerator.jsx`
**QuizGeneratorFromResource Component**
- Dropdown to select PDF resources
- "Generate 25 AI Questions" button
- Progress tracking
- Success/error notifications

---

## 🚀 Setup Instructions

### Step 1: Get Gemini API Key (2 minutes)
1. Visit: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy your key (starts with "AIza...")

### Step 2: Configure Environment (1 minute)
Edit `backend/.env`:
```bash
# Add this line
GEMINI_API_KEY=AIzaSy...your-actual-key-here
```

### Step 3: Restart Backend (30 seconds)
```bash
cd backend
python -m uvicorn app.main:app --reload
```

### Step 4: Integrate Frontend Component (5 minutes)

Add to your Admin Dashboard or Course Management page:

```jsx
import QuizGeneratorFromResource from '../components/QuizGenerator';

function AdminDashboard() {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [resources, setResources] = useState([]);

  // Fetch resources for the selected course
  useEffect(() => {
    if (selectedCourse) {
      fetchResources(selectedCourse.id);
    }
  }, [selectedCourse]);

  const fetchResources = async (courseId) => {
    const response = await fetch(
      `http://localhost:8000/api/courses/${courseId}/resources`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    const data = await response.json();
    setResources(data);
  };

  return (
    <div>
      {/* Your existing dashboard content */}
      
      {selectedCourse && (
        <QuizGeneratorFromResource
          courseId={selectedCourse.id}
          resources={resources}
          onQuizGenerated={(result) => {
            toast.success(`Created: ${result.title}`);
            // Refresh quiz list
            fetchQuizzes(selectedCourse.id);
          }}
        />
      )}
    </div>
  );
}
```

---

## 🎯 How It Works

### Complete Workflow

1. **Admin selects a PDF resource**
   - Component shows dropdown of all PDF resources in the course
   - Example: "Python Notes.pdf (2.3 MB)"

2. **Admin clicks "Generate 25 AI Questions"**
   - Frontend sends POST request to `/api/generate-quiz/{course_id}`
   - Includes `resource_id` as query parameter

3. **Backend fetches resource from database**
   - Queries `resources` table for the resource
   - Validates it's a PDF file
   - Gets the `file_url` (Supabase storage URL)

4. **Backend downloads PDF from Supabase**
   - Uses `requests` library to download from `file_url`
   - Saves to temporary file

5. **Backend extracts text**
   - PyMuPDF opens the PDF
   - Extracts text from all pages
   - Cleans and concatenates text

6. **Backend sends to Gemini AI**
   - Crafts intelligent prompt
   - Requests exactly 25 MCQ questions
   - Specifies strict JSON format

7. **Gemini AI generates questions**
   - Analyzes content
   - Creates questions testing understanding
   - Returns JSON array

8. **Backend validates and saves**
   - Validates each question structure
   - Creates new Quiz record in database
   - Returns success response

9. **Frontend displays success**
   - Shows toast notification
   - Triggers callback to refresh quiz list

**Total Time**: 15-40 seconds

---

## 📊 Question Format

### Database Schema
```json
{
  "question": "What is the purpose of Python's GIL?",
  "options": [
    "A) To prevent race conditions in multi-threaded programs",
    "B) To improve single-threaded performance",
    "C) To enable true parallelism",
    "D) To manage memory allocation"
  ],
  "answer": "A"
}
```

### Key Points
- ✅ Each question has exactly 4 options
- ✅ Options are labeled A), B), C), D)
- ✅ `answer` field contains the letter (A, B, C, or D)
- ✅ Questions test understanding, not memorization
- ✅ Distractors are plausible but clearly incorrect

---

## 🔒 Security & Auth

### Authentication
- ✅ Endpoint requires admin authentication (JWT)
- ✅ Uses `get_current_active_admin` dependency
- ✅ Validates course ownership

### Bcrypt 72-Byte Fix
The system maintains the bcrypt password fix:
```python
# In app/auth.py
def verify_password(plain_password, hashed_password):
    truncated_password = plain_password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
    return pwd_context.verify(truncated_password, hashed_password)
```

This ensures authentication remains stable during quiz generation.

---

## 📝 API Reference

### Endpoint: Generate Quiz from Resource

**Request:**
```http
POST /api/generate-quiz/{course_id}?resource_id={resource_id}&num_questions=25
Authorization: Bearer {JWT_TOKEN}
```

**Response (Success):**
```json
{
  "message": "Quiz generated successfully",
  "quiz_id": "uuid-here",
  "title": "Auto-Generated Quiz: Python Notes.pdf",
  "num_questions": 25,
  "questions": [
    {
      "question": "What is...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "answer": "A"
    }
  ]
}
```

**Response (Error):**
```json
{
  "detail": "Resource not found"
}
```

### Status Codes
- `200` - Success
- `400` - Invalid request (not a PDF, etc.)
- `401` - Unauthorized (not admin)
- `404` - Course or resource not found
- `500` - Server error (AI generation failed, etc.)

---

## 🎨 Frontend Integration Examples

### Example 1: In Course Edit Page
```jsx
import QuizGeneratorFromResource from '../components/QuizGenerator';

function CourseEdit({ courseId }) {
  const [resources, setResources] = useState([]);

  useEffect(() => {
    fetchResources();
  }, [courseId]);

  return (
    <div>
      <h2>Course Resources</h2>
      {/* Display resources */}
      
      <QuizGeneratorFromResource
        courseId={courseId}
        resources={resources}
        onQuizGenerated={(result) => {
          console.log('Quiz created:', result.quiz_id);
        }}
      />
    </div>
  );
}
```

### Example 2: In Admin Dashboard
```jsx
function AdminDashboard() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);

  return (
    <div>
      <select onChange={(e) => setSelectedCourse(courses.find(c => c.id === e.target.value))}>
        {courses.map(course => (
          <option key={course.id} value={course.id}>{course.title}</option>
        ))}
      </select>

      {selectedCourse && (
        <QuizGeneratorFromResource
          courseId={selectedCourse.id}
          resources={selectedCourse.resources}
          onQuizGenerated={() => {
            toast.success('Quiz generated!');
          }}
        />
      )}
    </div>
  );
}
```

---

## 🐛 Troubleshooting

### Issue: "GEMINI_API_KEY not found"
**Solution:**
1. Add key to `backend/.env`
2. Restart backend server
3. Verify key is correct (starts with "AIza")

### Issue: "Resource not found"
**Solution:**
1. Verify resource exists in database
2. Check `resource_id` is correct UUID
3. Ensure resource belongs to the specified course

### Issue: "Only PDF resources are supported"
**Solution:**
- Select a file ending in `.pdf`
- Check `file_name` in database

### Issue: "Failed to download PDF from URL"
**Solution:**
1. Verify `file_url` is publicly accessible
2. Check Supabase storage permissions
3. Ensure URL is not expired

### Issue: "Insufficient content extracted"
**Solution:**
- PDF must have readable text (not scanned images)
- Minimum 100 characters required
- Consider using OCR for scanned PDFs

### Issue: "Failed to parse AI response"
**Solution:**
1. Check Gemini API rate limits
2. Verify API key is valid
3. Try again (AI responses can occasionally fail)

---

## ✨ Features

### What Works
- ✅ Download PDFs from Supabase storage
- ✅ Extract text from multi-page PDFs
- ✅ Generate exactly 25 questions
- ✅ Validate question format
- ✅ Save to database automatically
- ✅ Admin-only access
- ✅ Progress tracking in UI
- ✅ Error handling and logging
- ✅ Automatic cleanup of temp files

### Question Quality
- ✅ Tests understanding, not memorization
- ✅ Covers multiple topics from content
- ✅ Mixed difficulty levels
- ✅ Plausible distractors
- ✅ Clear, unambiguous questions

---

## 🔮 Future Enhancements

### Planned Features
- [ ] Support for DOCX and TXT files
- [ ] OCR for scanned PDFs
- [ ] Custom difficulty selection
- [ ] Question categorization by topic
- [ ] Bulk quiz generation
- [ ] Question review/edit interface
- [ ] Export quizzes to different formats

### Potential Improvements
- [ ] Caching for repeated PDFs
- [ ] Progress bar for long operations
- [ ] Preview questions before saving
- [ ] Duplicate question detection
- [ ] Multi-language support

---

## 📚 Testing

### Manual Testing Steps

1. **Upload a PDF resource**
   ```
   - Go to course management
   - Upload "Python Basics.pdf"
   - Verify it appears in resources list
   ```

2. **Generate quiz**
   ```
   - Select the PDF from dropdown
   - Click "Generate 25 AI Questions"
   - Wait 15-40 seconds
   - Verify success message
   ```

3. **Check database**
   ```sql
   SELECT * FROM quizzes WHERE course_id = 'your-course-id';
   ```

4. **View quiz in frontend**
   ```
   - Go to course page
   - Click "Knowledge Check"
   - Verify 25 questions appear
   ```

### Sample Test Cases

| Test Case | Expected Result |
|-----------|----------------|
| Select PDF and generate | 25 questions created |
| Select non-PDF file | Error: "Only PDF supported" |
| Generate without selection | Error: "Please select a PDF" |
| Generate as non-admin | 401 Unauthorized |
| Invalid resource_id | 404 Resource not found |

---

## 🎉 Success Criteria

Your system is working correctly if:
- ✅ Admin can select PDF from dropdown
- ✅ System downloads PDF from Supabase
- ✅ Text is extracted successfully
- ✅ Gemini AI generates 25 questions
- ✅ Questions are saved to database
- ✅ Questions appear in KnowledgeCheck
- ✅ Process completes in < 60 seconds
- ✅ Auth remains stable (bcrypt fix working)

---

## 📞 Support

### Logs to Check
1. **Backend logs**: Check uvicorn console for errors
2. **Browser console**: Check for frontend errors
3. **Network tab**: Verify API calls are successful

### Common Log Messages
```
INFO: Generating quiz from resource: Python Notes.pdf (ID: uuid)
INFO: Extracted 5234 characters from PDF
INFO: Generating 25 quiz questions using Gemini AI...
INFO: Successfully generated 25 questions
INFO: Successfully created quiz with 25 questions
```

---

## 📄 License
MIT License - See LICENSE file for details

---

**Status:** ✅ Ready for Production
**Version:** 2.0.0
**Last Updated:** February 13, 2026

---

## 🎓 Quick Start Checklist

- [ ] Get Gemini API key
- [ ] Add key to `.env`
- [ ] Restart backend
- [ ] Add QuizGenerator component to admin page
- [ ] Upload a PDF resource
- [ ] Generate your first quiz!

**You're all set! Happy teaching! 🚀**

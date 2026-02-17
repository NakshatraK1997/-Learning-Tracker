# 🚀 Quick Start Guide - AI Quiz Generation

## ⚡ 3-Minute Setup

### Step 1: Get Your Gemini API Key (1 minute)
1. Open: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key (starts with "AIza...")

### Step 2: Add API Key to Environment (30 seconds)
Open `backend/.env` and add:
```bash
GEMINI_API_KEY=AIzaSy...your-actual-key-here
```

### Step 3: Restart Backend (30 seconds)
```bash
cd backend
python -m uvicorn app.main:app --reload
```

### Step 4: Test the Endpoint (1 minute)
```bash
# Replace COURSE_ID and TOKEN with your actual values
curl -X POST "http://localhost:8000/api/courses/COURSE_ID/generate-quiz" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.pdf"
```

## 🎯 First Quiz Generation

### Using the Frontend Component

1. **Import the component:**
```jsx
import QuizGenerator from './components/QuizGenerator';
```

2. **Add to your admin page:**
```jsx
<QuizGenerator 
  courseId="your-course-uuid"
  onQuizGenerated={(result) => {
    console.log(`Generated ${result.num_questions} questions!`);
  }}
/>
```

3. **Upload a PDF and click "Generate 25 Questions"**

That's it! Your quiz will be generated in 15-40 seconds.

## 📝 Example API Call

```javascript
const generateQuiz = async () => {
  const formData = new FormData();
  formData.append('file', pdfFile);
  
  const response = await fetch(
    `http://localhost:8000/api/courses/${courseId}/generate-quiz`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    }
  );
  
  const result = await response.json();
  console.log(result); // { quiz_id, title, num_questions, questions }
};
```

## ✅ Verify It's Working

1. Upload a PDF (any educational content)
2. Wait for "Quiz generated successfully!" message
3. Check your database - new quiz should appear
4. Questions should be visible in the course

## 🐛 Common Issues

**"GEMINI_API_KEY not found"**
→ Add the key to `.env` and restart backend

**"Only PDF files are supported"**
→ Make sure you're uploading a .pdf file

**"Failed to generate questions"**
→ Check if PDF has readable text (not scanned images)

## 📚 Full Documentation

For detailed documentation, see:
- `QUIZ_GENERATION_SUMMARY.md` - Complete implementation guide
- `backend/QUIZ_GENERATION_README.md` - Technical details

## 🎉 You're Ready!

Your AI quiz generation system is now fully functional. Happy teaching! 🎓

# 🚀 Quiz Generation - Quick Reference

## ⚡ 30-Second Setup

1. **Get API Key**: https://makersuite.google.com/app/apikey
2. **Add to `.env`**: `GEMINI_API_KEY=your-key-here`
3. **Restart backend**: `python -m uvicorn app.main:app --reload`
4. **Done!** ✅

---

## 📡 API Endpoint

```http
POST /api/generate-quiz/{course_id}?resource_id={resource_id}
Authorization: Bearer {JWT_TOKEN}
```

**Response:**
```json
{
  "quiz_id": "uuid",
  "title": "Auto-Generated Quiz: filename.pdf",
  "num_questions": 25,
  "questions": [...]
}
```

---

## 💻 Frontend Integration

```jsx
import QuizGeneratorFromResource from '../components/QuizGenerator';

<QuizGeneratorFromResource
  courseId={courseId}
  resources={resources}
  onQuizGenerated={(result) => {
    toast.success(`Generated ${result.num_questions} questions!`);
  }}
/>
```

---

## 🎯 How It Works

1. Admin selects PDF from dropdown
2. System downloads PDF from Supabase
3. Extracts text with PyMuPDF
4. Sends to Gemini AI
5. AI generates 25 MCQ questions
6. Saves to database
7. Ready for students!

**Time**: 15-40 seconds

---

## 📝 Question Format

```json
{
  "question": "What is...",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "answer": "A"
}
```

---

## 🐛 Quick Troubleshooting

| Issue | Fix |
|-------|-----|
| "API key not found" | Add to `.env` and restart |
| "Resource not found" | Check resource_id is correct |
| "Only PDF supported" | Select a .pdf file |
| "Failed to download" | Check Supabase storage URL |

---

## ✅ Success Checklist

- [ ] Gemini API key added to `.env`
- [ ] Backend restarted
- [ ] Component added to admin page
- [ ] PDF resource uploaded
- [ ] Quiz generated successfully

---

## 📚 Full Documentation

See `QUIZ_GENERATION_COMPLETE_GUIDE.md` for detailed instructions.

---

**Ready to generate quizzes! 🎓**

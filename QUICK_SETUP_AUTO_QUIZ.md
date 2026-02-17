# 🚀 Quick Setup - Automated Quiz Generation

## ⚡ 3-Step Setup (5 minutes)

### Step 1: Add Endpoint to main.py

Open `backend/app/main.py` and copy the code from `backend/app/auto_quiz_endpoint.py` **before** the `if __name__ == "__main__":` line.

Or manually add:
```python
@app.post("/api/courses/{course_id}/auto-generate-quiz")
async def auto_generate_quiz_for_course(
    course_id: UUID,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_admin),
):
    # See auto_quiz_endpoint.py for full code
    ...
```

### Step 2: Update Course.jsx

Open `frontend/src/pages/Course.jsx`:

**Add import:**
```jsx
import AutoQuizGenerator from '../components/AutoQuizGenerator';
```

**Replace "No knowledge check available" section (line ~449-456):**
```jsx
) : (
    <AutoQuizGenerator
        courseId={id}
        onQuizGenerated={(result) => {
            toast.success(`Generated ${result.num_questions} questions!`);
            window.location.reload();
        }}
    />
)}
```

### Step 3: Restart Backend

```bash
cd backend
python -m uvicorn app.main:app --reload
```

## ✅ Done!

Now when students open a course with no quiz, they'll see an "Auto-Generate 25 Questions" button that creates a quiz from the PDF resources!

---

## 🎯 How It Works

1. Student opens course → No quiz exists
2. Sees "Auto-Generate 25 Questions" button
3. Clicks button
4. System finds PDF resource
5. Extracts text
6. Gemini AI generates 25 questions
7. Saves to database
8. Quiz appears! (15-40 seconds)

---

## 📚 Full Documentation

See `AUTO_QUIZ_IMPLEMENTATION_GUIDE.md` for complete details.

---

## 🐛 Troubleshooting

**"GEMINI_API_KEY not found"**
→ Add to `.env` and restart backend

**"No PDF resources found"**
→ Upload a PDF to the course first

**"Failed to generate"**
→ Check backend logs for details

---

**Ready to auto-generate quizzes! 🎓**

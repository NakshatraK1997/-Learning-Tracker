# Database Design Document

## Overview
This database is designed for a **Learning Tracker System** optimized for small teams. It focuses on tracking assignments, progress, and quiz results for reporting purposes.

## Entity-Relationship Diagram (ERD)

- **Users** (1) ---- (N) **CourseAssignments** (N) ---- (1) **Courses**
- **Users** (1) ---- (N) **Progress** (N) ---- (1) **Courses**
- **Courses** (1) ---- (1) **Quizzes**
- **Quizzes** (1) ---- (N) **QuizQuestions** (1) ---- (N) **QuizAnswers**
- **Users** (1) ---- (N) **QuizResults** (N) ---- (1) **Quizzes**

## Key Design Decisions

1.  **Normalization**: Quiz structures are fully normalized into `Quizzes`, `Questions`, and `Answers` tables. This allows for detailed reporting on which questions are frequently missed (item analysis).
2.  **Referential Integrity**: `ON DELETE CASCADE` is used extensively. If a generic User or Course is deleted, all associated progress, notes, and results are automatically removed to maintain data cleanliness.
3.  **Audit**: Timestamps (`created_at`, `updated_at`, `submitted_at`) are included to track learner engagement over time.
4.  **Flexible Progress**: The `progress` table is separate from `assignments` to allow tracking of optional courses or self-enrolled courses in the future without cluttering the assignment logic.

## Tables & Usage

| Table | Purpose |
| :--- | :--- |
| `users` | Stores login credentials and role (Admin/Learner). |
| `courses` | Catalog of available learning modules. |
| `course_assignments` | Links learners to courses they *must* take. |
| `progress` | Tracks completion status and last access times. |
| `notes` | Stores private notes taken by learners during the course. |
| `quizzes` | Stores quiz metadata linked to courses. |
| `quiz_questions` | Individual questions for a quiz. |
| `quiz_answers` | Multiple-choice options for each question. |
| `quiz_results` | Final scores for reporting and compliance tracking. |

## Optimization for Reporting
*   **Indices**: Foreign keys should be indexed (PostgreSQL does not auto-index FKs) for fast joins when generating "User Progress Reports".
*   **Views**: A view joining `users`, `courses`, `progress`, and `quiz_results` would provide a single "Master Report" table for Admins.

## Usage
Run the `schema.sql` file to initialize the database:
```bash
psql -U username -d dmname -f database/schema.sql
```

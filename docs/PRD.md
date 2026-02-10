# Product Requirements Document (PRD): Lightweight Learning Tracker

## 1. Introduction & Background
Internal training and onboarding for small teams is often disorganized, relying on scattered Google Docs, YouTube links, and spreadsheets. Enterprise Learning Management Systems (LMS) are too complex and expensive for simple tracking needs.

**The Solution:** The Lightweight Learning Tracker is a simplified web application that facilitates structured learning. It allows organizations to create courses, assign them to employees, and track their completion progress and quiz scores in a centralized dashboard.

## 2. Goals & Objectives
### Business Goals
*   **Centralize Knowledge:** Create a single source of truth for onboarding and training materials.
*   **Track Compliance:** Ensure employees have watched required videos and passed understanding checks (quizzes).
*   **Reduce Overhead:** Minimize manual tracking of who has learned what.

### User Goals
*   **Learners:** Easily access assigned training, track their own progress, and prove competence via quizzes.
*   **Admins:** Quickly create courses, manage users, and view reports without navigating complex menus.

## 3. Target Users & Personas
### Primary Persona: The Admin (Manager/HR)
*   **Goal:** Efficiently manage team training.
*   **Pain Point:** "I don't know who has watched the new safety video."
*   **Behaviors:** Creates content, assigns courses, checks reports.

### Secondary Persona: The Learner (Employee)
*   **Goal:** Complete required training quickly.
*   **Pain Point:** "I can't find the link to the training video."
*   **Behaviors:** Logs in, watches videos, downloads PDFs, takes quizzes.

## 4. Scope
### In Scope (MVP)
*   **Authentication:** Secure Login/Signup with Role-Based Access Control (Admin/Learner).
*   **Course Management:** Create, Edit, Delete courses with metadata (Title, Description, Video URL).
*   **Resource Management:** Upload/Link auxiliary files (PDFs) to courses.
*   **Enrollment:** Manual assignment of courses to specific learners by Admins.
*   **Learning Experience:** Video player implementation, personal notes taking, progress tracking (0-100%).
*   **Assessment:** Multiple-choice quiz creation (Admin) and execution (Learner) with auto-scoring.
*   **Dashboards:**
    *   *Admin:* Overview of system stats, User management table, Course lists.
    *   *Learner:* Grid of assigned courses, progress indicators.

### Out of Scope (For Now)
*   Payment processing or subscription management.
*   Live webinar hosting.
*   Social features (comments, forums).
*   Native mobile applications (iOS/Android).
*   Scorm/xAPI compliance.

## 5. Functional Requirements

### 5.1 Authentication & User Management
*   System must support two user roles: `Admin` and `Learner`.
*   Admins must be able to view all users and edit their details (Name, Role).
*   Users must log in using Email/Password.

### 5.2 Course Management (Admin)
*   Admins can create new courses with a YouTube/Vimeo embed URL.
*   Admins can upload/link downloadable resources (PDFs, Docs) to a course.
*   Admins can create a Quiz for a course with multiple-choice questions.

### 5.3 Learning Interface (Learner)
*   Learners see a dashboard of only their assigned courses.
*   Course view includes a video player, description, and list of resources.
*   Learners can save private text notes for each course.
*   System must track "Mark as Completed" status.

### 5.4 Quizzes & Assessment
*   Learners can take a quiz associated with a course.
*   System auto-calculates score immediately upon submission.
*   Passing a quiz (e.g., >70%) automatically marks the course as completed (optional flow).

### 5.5 Progress Tracking
*   Admins can view valid progress metrics for the organization (Total Users, Completion Rates).
*   Learners see visual progress bars for their active courses.

## 6. Non-Functional Requirements
*   **Performance:** Dashboards should load within 2 seconds. Video playback depends on external provider (YouTube) but UI must remain responsive.
*   **Scalability:** Database schema designed to support thousands of users/courses (PostgreSQL).
*   **Security:**
    *   Passwords securely hashed.
    *   API endpoints protected by JWT authentication.
    *   Role checks enforced on backend (Admins cannot be impersonated).
*   **Usability:** Mobile-responsive design using Tailwind CSS. Clean, modern UI (Glassmorphism touches).

## 7. User Flow (High Level)
1.  **Admin Setup:** Admin logs in -> Creates "Security 101" Course -> Adds Video & Quiz -> Assigns to "John Doe".
2.  **Learner Access:** John logs in -> Sees "Security 101" on Dashboard -> Clicks to open.
3.  **Consumption:** John watches video -> Downloads PDF -> Types notes.
4.  **Assessment:** John clicks "Take Quiz" -> Answers questions -> Submits -> Sees Score.
5.  **Completion:** Course marked "Completed".
6.  **Review:** Admin checks Dashboard -> Sees John's completion status.

## 8. Technology Stack

### Frontend
- **Framework:** React.js (via Vite)
- **Styling:** Tailwind CSS (Modern UI with Glassmorphism)
- **State Management:** React Context API
- **Icons:** Lucide React
- **HTTP Client:** Axios
- **Routing:** React Router DOM V6

### Backend
- **Framework:** Python FastAPI (Async)
- **ORM:** SQLAlchemy (with Pydantic for schemas)
- **Validation:** Pydantic
- **Authentication:** JWT (JSON Web Tokens) with passlib/bcrypt hashing
- **Server:** Uvicorn (ASGI)

### Database
- **Primary DB:** PostgreSQL (via Supabase)
- **Schema Management:** SQLAlchemy Models

### Infrastructure
- **Hosting (Backend):** (TBD - e.g., Railway/Render)
- **Hosting (Frontend):** (TBD - e.g., Vercel/Netlify)
- **Video Hosting:** External (YouTube/Vimeo Embeds)

## 9. Assumptions & Constraints
*   **Assumptions:**
    *   Videos are hosted externally (YouTube, Vimeo, etc.).
    *   Users have stable internet connection.
*   **Constraints:**
    *   MVP Timeline: 2-3 weeks.
    *   Technology Stack: React (Vite), Python FastAPI, PostgreSQL (Supabase).

## 10. Success Metrics / KPIs
*   **Adoption:** % of invited users who log in.
*   **Engagement:** Average time spent per course.
*   **Completion Rate:** % of assigned courses marked as completed.
*   **Pass Rate:** Average quiz score across the organization.

## 11. Future Enhancements
*   **Gamification:** Badges and Leaderboards for top learners.
*   **Certificates:** Auto-generate PDF certificates upon course completion.
*   **Bulk Actions:** Import users via CSV.
*   **Notifications:** Email alerts for new assignments or due dates.

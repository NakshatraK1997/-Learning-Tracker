-- Example Records for Learning Tracker DB

-- 1. Create a Users
INSERT INTO users (email, password_hash, full_name, role) VALUES
('admin@company.com', '$2b$12$hashedpasswordexample', 'Admin User', 'admin'),
('learner1@company.com', '$2b$12$hashedpasswordexample', 'John Learner', 'learner'),
('learner2@company.com', '$2b$12$hashedpasswordexample', 'Jane Smith', 'learner');

-- 2. Create Courses
INSERT INTO courses (title, description, video_url) VALUES
('React Basics', 'Introduction to React.js', 'https://www.youtube.com/embed/dQw4w9WgXcQ'),
('FastAPI Fundamentals', 'Build high-performance APIs', 'https://www.youtube.com/embed/dQw4w9WgXcQ');

-- 3. Assign Courses (Create Assignments)
INSERT INTO course_assignments (user_id, course_id, assigned_at) VALUES
(2, 1, CURRENT_TIMESTAMP), -- John assigned React
(3, 1, CURRENT_TIMESTAMP), -- Jane assigned React
(3, 2, CURRENT_TIMESTAMP); -- Jane assigned FastAPI

-- 4. Track Progress
INSERT INTO progress (user_id, course_id, is_completed, last_accessed_at) VALUES
(2, 1, FALSE, CURRENT_TIMESTAMP),
(3, 1, TRUE, CURRENT_TIMESTAMP);

-- 5. Add Notes
INSERT INTO notes (user_id, course_id, content) VALUES
(2, 1, 'Components are reusable pieces of UI.');

-- 6. Create Quiz for React Course
INSERT INTO quizzes (course_id, title) VALUES
(1, 'React Knowledge Check');

-- 7. Add Questions
INSERT INTO quiz_questions (quiz_id, question_text, order_num) VALUES
(1, 'What is a Component?', 1),
(1, 'What is used to pass data to components?', 2);

-- 8. Add Answers (Options)
INSERT INTO quiz_answers (question_id, answer_text, is_correct) VALUES
(1, 'A function or class that returns UI', TRUE),
(1, 'A database table', FALSE),
(2, 'Props', TRUE),
(2, 'State', FALSE);

-- 9. Record Quiz Result (Reporting)
INSERT INTO quiz_results (user_id, quiz_id, score_percentage, passed) VALUES
(3, 1, 100, TRUE);

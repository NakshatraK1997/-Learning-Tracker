-- Supabase PostgreSQL Schema for Lightweight Learning Tracker

-- 1. Enum Definitions
CREATE TYPE user_role AS ENUM ('admin', 'learner');
CREATE TYPE content_type AS ENUM ('video', 'pdf', 'link');
CREATE TYPE assignment_status AS ENUM ('assigned', 'in_progress', 'completed');

-- 2. Profiles Table (Linked to Supabase Auth)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT UNIQUE,
  role user_role DEFAULT 'learner',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Courses Table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Course Content Table
CREATE TABLE public.course_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  content_type content_type NOT NULL,
  content_url TEXT NOT NULL,
  sequence_order INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Course Assignments Table
CREATE TABLE public.course_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  learner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  due_date DATE,
  status assignment_status DEFAULT 'assigned',
  UNIQUE(course_id, learner_id)
);

-- 6. Quizzes Table
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  passing_score INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Quiz Questions Table
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_option CHAR(1), -- 'A', 'B', 'C', or 'D'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_correct_option CHECK (correct_option IN ('A', 'B', 'C', 'D'))
);

-- 8. Quiz Attempts Table
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE, -- Should also cascade attempts if quiz deleted?
  learner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INT,
  passed BOOLEAN,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Progress Tracking Table
CREATE TABLE public.course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  progress_percent INT DEFAULT 0,
  last_accessed TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(learner_id, course_id)
);

-- 10. Indexes for Performance
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_courses_created_by ON public.courses(created_by);
CREATE INDEX idx_course_contents_course_id ON public.course_contents(course_id);
CREATE INDEX idx_assignments_learner_id ON public.course_assignments(learner_id);
CREATE INDEX idx_assignments_course_id ON public.course_assignments(course_id);
CREATE INDEX idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id);
CREATE INDEX idx_quiz_attempts_learner_id ON public.quiz_attempts(learner_id);
CREATE INDEX idx_course_progress_learner_id ON public.course_progress(learner_id);

-- 11. Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

-- Helper Function: Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT USING (true); -- Or restrict to authenticated users

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Courses Policies
CREATE POLICY "Admins can do everything on courses" 
  ON public.courses FOR ALL USING (public.is_admin());

CREATE POLICY "Learners can view assigned courses" 
  ON public.courses FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.course_assignments ca
      WHERE ca.course_id = public.courses.id
      AND ca.learner_id = auth.uid()
    ) OR public.is_admin() -- Ensure admins can also see via this policy if ALL policy fails
  );

-- Course Contents Policies
CREATE POLICY "Admins can manage contents" 
  ON public.course_contents FOR ALL USING (public.is_admin());

CREATE POLICY "Learners can view contents of assigned courses" 
  ON public.course_contents FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.course_assignments ca
      WHERE ca.course_id = public.course_contents.course_id
      AND ca.learner_id = auth.uid()
    )
  );

-- Course Assignments Policies
CREATE POLICY "Admins can manage assignments" 
  ON public.course_assignments FOR ALL USING (public.is_admin());

CREATE POLICY "Learners can view their own assignments" 
  ON public.course_assignments FOR SELECT USING (learner_id = auth.uid());

-- Quizzes/Questions Policies
CREATE POLICY "Admins can manage quizzes" 
  ON public.quizzes FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage quiz questions" 
  ON public.quiz_questions FOR ALL USING (public.is_admin());

CREATE POLICY "Learners can view quizzes for assigned courses" 
  ON public.quizzes FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.course_assignments ca
      WHERE ca.course_id = public.quizzes.course_id
      AND ca.learner_id = auth.uid()
    )
  );

CREATE POLICY "Learners can view questions for assigned quizzes" 
  ON public.quiz_questions FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      JOIN public.course_assignments ca ON ca.course_id = q.course_id
      WHERE q.id = public.quiz_questions.quiz_id
      AND ca.learner_id = auth.uid()
    )
  );

-- Quiz Attempts Policies
CREATE POLICY "Admins can view all attempts" 
  ON public.quiz_attempts FOR ALL USING (public.is_admin());

CREATE POLICY "Learners can view and insert own attempts" 
  ON public.quiz_attempts FOR ALL USING (learner_id = auth.uid());

-- Course Progress Policies
CREATE POLICY "Admins can view all progress" 
  ON public.course_progress FOR ALL USING (public.is_admin());

CREATE POLICY "Learners can manage own progress" 
  ON public.course_progress FOR ALL USING (learner_id = auth.uid());

-- Function to Handle New User Creation via Trigger (Optional but Recommended for clean flow)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'learner');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

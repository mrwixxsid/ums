
-- =============================================
-- UNIVERSITY MANAGEMENT PORTAL - FULL SCHEMA
-- =============================================

-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM ('super_admin', 'teacher', 'student');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late');
CREATE TYPE public.exam_type AS ENUM ('mid', 'lab', 'final');
CREATE TYPE public.notice_type AS ENUM ('urgent', 'informational', 'fun');
CREATE TYPE public.request_type AS ENUM ('class_reschedule', 'exam_reschedule', 'extra_class', 'bonus_points');
CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected');

-- 2. PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  student_id TEXT,
  department TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. USER ROLES TABLE (separate, never on profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. SECURITY DEFINER FUNCTION (no recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- helper to get current user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
$$;

-- 5. COURSES
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  credits INTEGER DEFAULT 3,
  department TEXT,
  semester TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- 6. TEACHER_COURSES (many-to-many)
CREATE TABLE public.teacher_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, course_id)
);

ALTER TABLE public.teacher_courses ENABLE ROW LEVEL SECURITY;

-- 7. ENROLLMENTS (students in courses)
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id)
);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- 8. CLASSES (individual class sessions)
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  room TEXT,
  notes TEXT,
  is_cancelled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- 9. ATTENDANCE
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 10. EXAM SCHEDULES
CREATE TABLE public.exam_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  exam_type exam_type NOT NULL,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 120,
  room TEXT,
  total_marks INTEGER DEFAULT 100,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;

-- 11. EXAM RESULTS
CREATE TABLE public.exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exam_schedules(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  marks_obtained NUMERIC(5,2),
  grade TEXT,
  remarks TEXT,
  is_published BOOLEAN DEFAULT false,
  entered_by UUID REFERENCES auth.users(id),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id)
);

ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

-- 12. NOTICES
CREATE TABLE public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  notice_type notice_type DEFAULT 'informational',
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  posted_by UUID REFERENCES auth.users(id),
  is_pinned BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- 13. REQUESTS (student → teacher)
CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  request_type request_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  preset_reason TEXT,
  custom_reason TEXT,
  emoji_reaction TEXT,
  status request_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  teacher_comment TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- 14. ASSESSMENTS
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  marks_obtained NUMERIC(5,2),
  total_marks NUMERIC(5,2) DEFAULT 100,
  assessment_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- 15. NOTES (teacher posts course notes)
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 16. GLOBAL SETTINGS
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- AUTO-UPDATE TIMESTAMPS TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- RLS POLICIES
-- =============================================

-- PROFILES
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Super admin can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- USER_ROLES
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin manages roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- COURSES
CREATE POLICY "Authenticated users view active courses" ON public.courses FOR SELECT TO authenticated USING (is_active = true OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin manages courses" ON public.courses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- TEACHER_COURSES
CREATE POLICY "View teacher courses" ON public.teacher_courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manages teacher_courses" ON public.teacher_courses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- ENROLLMENTS
CREATE POLICY "Students view own enrollments" ON public.enrollments FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Super admin manages enrollments" ON public.enrollments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- CLASSES
CREATE POLICY "Enrolled users view classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers manage own classes" ON public.classes FOR ALL TO authenticated USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- ATTENDANCE
CREATE POLICY "Students view own attendance" ON public.attendance FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Teachers manage attendance" ON public.attendance FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'super_admin'));

-- EXAM_SCHEDULES
CREATE POLICY "All authenticated view exams" ON public.exam_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manages exams" ON public.exam_schedules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- EXAM_RESULTS
CREATE POLICY "Students view own published results" ON public.exam_results FOR SELECT TO authenticated USING (student_id = auth.uid() AND is_published = true OR public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Teachers manage results" ON public.exam_results FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'super_admin'));

-- NOTICES
CREATE POLICY "All authenticated view notices" ON public.notices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin and teachers post notices" ON public.notices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'teacher'));

-- REQUESTS
CREATE POLICY "Students view own requests" ON public.requests FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Students create requests" ON public.requests FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid() AND public.has_role(auth.uid(), 'student'));
CREATE POLICY "Teachers update requests" ON public.requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'super_admin'));

-- ASSESSMENTS
CREATE POLICY "Students view own assessments" ON public.assessments FOR SELECT TO authenticated USING (student_id = auth.uid() OR teacher_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Teachers manage assessments" ON public.assessments FOR ALL TO authenticated USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- NOTES
CREATE POLICY "Enrolled students view notes" ON public.notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers manage notes" ON public.notes FOR ALL TO authenticated USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- SETTINGS
CREATE POLICY "All view settings" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manages settings" ON public.settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- Insert default settings
INSERT INTO public.settings (key, value) VALUES
  ('portal_name', 'University Management Portal'),
  ('current_semester', 'Spring 2026'),
  ('academic_year', '2025-2026');

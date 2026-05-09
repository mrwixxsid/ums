-- =============================================
-- UNIVERSITY MANAGEMENT SYSTEM PORTAL
-- Complete Database Schema
-- =============================================
-- This file creates the entire database schema from scratch.
-- Safe to re-run: uses IF NOT EXISTS and CREATE OR REPLACE.
-- Paste this into Supabase SQL Editor and click "Run".
-- =============================================

-- =============================================
-- 1. ENUMS
-- =============================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin', 'manager', 'teacher', 'student');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.exam_type AS ENUM ('mid', 'lab', 'final');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notice_type AS ENUM ('urgent', 'informational', 'fun');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.request_type AS ENUM ('class_reschedule', 'exam_reschedule', 'extra_class', 'bonus_points');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- 2. TABLES
-- =============================================

-- Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  student_id TEXT,
  department TEXT,
  phone TEXT,
  avatar_url TEXT,
  batch_id UUID,
  designation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Batches
CREATE TABLE IF NOT EXISTS public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  batch_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  semester INTEGER NOT NULL,
  starting_roll INTEGER NOT NULL UNIQUE,
  student_count INTEGER DEFAULT 0,
  is_graduated BOOLEAN NOT NULL DEFAULT false,
  admission_session TEXT NOT NULL DEFAULT 'January',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

-- Rooms
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL,
  type TEXT DEFAULT 'Class',
  capacity INTEGER DEFAULT 60,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Courses
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  credits INTEGER DEFAULT 3,
  department TEXT,
  semester TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  year INTEGER,
  semester_number INTEGER,
  course_type TEXT,
  contact_hours INTEGER,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  is_non_departmental BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Teacher-Course Assignments
CREATE TABLE IF NOT EXISTS public.teacher_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, course_id)
);
ALTER TABLE public.teacher_courses ENABLE ROW LEVEL SECURITY;

-- Enrollments (students in courses)
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id)
);
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Classes (individual class sessions)
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  room TEXT,
  notes TEXT,
  is_cancelled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Attendance
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Exam Schedules
CREATE TABLE IF NOT EXISTS public.exam_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
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

-- Exam Results
CREATE TABLE IF NOT EXISTS public.exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exam_schedules(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  marks_obtained NUMERIC(5,2),
  grade TEXT,
  remarks TEXT,
  is_published BOOLEAN DEFAULT false,
  entered_by UUID REFERENCES auth.users(id),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id)
);
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

-- Notices
CREATE TABLE IF NOT EXISTS public.notices (
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

-- Requests (student → teacher)
CREATE TABLE IF NOT EXISTS public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
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

-- Assessments
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  marks_obtained NUMERIC(5,2),
  total_marks NUMERIC(5,2) DEFAULT 100,
  assessment_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- Notes (teacher course notes)
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Settings
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Academic Semesters
CREATE TABLE IF NOT EXISTS public.academic_semesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  mid_exam_start DATE,
  mid_exam_end DATE,
  final_exam_start DATE,
  final_exam_end DATE,
  result_publish_date DATE,
  next_semester_start DATE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.academic_semesters ENABLE ROW LEVEL SECURITY;

-- Routines
CREATE TABLE IF NOT EXISTS public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 4),
  period_number INTEGER NOT NULL CHECK (period_number BETWEEN 1 AND 7),
  is_lab_continuation BOOLEAN NOT NULL DEFAULT false,
  lab_group INTEGER,
  semester_id UUID REFERENCES public.academic_semesters(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. FOREIGN KEY CONSTRAINTS (cross-table references)
-- =============================================

-- profiles.batch_id -> batches
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_batch_id_fkey
    FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- user_roles.user_id -> profiles
DO $$ BEGIN
  ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- teacher_courses.teacher_id -> profiles
DO $$ BEGIN
  ALTER TABLE public.teacher_courses
    ADD CONSTRAINT teacher_courses_teacher_id_fkey
    FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- enrollments.student_id -> profiles
DO $$ BEGIN
  ALTER TABLE public.enrollments
    ADD CONSTRAINT enrollments_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- exam_results.student_id -> profiles
DO $$ BEGIN
  ALTER TABLE public.exam_results
    ADD CONSTRAINT exam_results_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- routines.teacher_id -> profiles
DO $$ BEGIN
  ALTER TABLE public.routines
    ADD CONSTRAINT routines_teacher_id_fkey
    FOREIGN KEY (teacher_id) REFERENCES public.profiles(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- 4. INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_routines_day_period ON public.routines(day_of_week, period_number);
CREATE INDEX IF NOT EXISTS idx_routines_teacher ON public.routines(teacher_id, day_of_week, period_number);
CREATE INDEX IF NOT EXISTS idx_routines_room ON public.routines(room_id, day_of_week, period_number);
CREATE INDEX IF NOT EXISTS idx_routines_batch ON public.routines(batch_id, day_of_week, period_number);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_batch_per_dept_semester
  ON public.batches (department_id, semester)
  WHERE is_graduated = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_enrollment
  ON public.enrollments (student_id, course_id);

-- =============================================
-- 5. FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS app_role
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
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

-- =============================================
-- 6. TRIGGERS
-- =============================================

-- Auto-update timestamps
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS courses_updated_at ON public.courses;
CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 7. RLS POLICIES
-- =============================================

-- Helper: drop policy if exists (for idempotency)
-- We use DO blocks to avoid errors on re-run

-- PROFILES
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Super admin can insert profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
END $$;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Super admin can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Public can view profiles" ON public.profiles FOR SELECT TO anon USING (true);

-- USER_ROLES
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
  DROP POLICY IF EXISTS "Super admin manages roles" ON public.user_roles;
  DROP POLICY IF EXISTS "Public can view user_roles" ON public.user_roles;
END $$;

CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin manages roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Public can view user_roles" ON public.user_roles FOR SELECT TO anon USING (true);

-- DEPARTMENTS
DO $$ BEGIN
  DROP POLICY IF EXISTS "All authenticated view departments" ON public.departments;
  DROP POLICY IF EXISTS "Super admin manages departments" ON public.departments;
END $$;

CREATE POLICY "All authenticated view departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Super admin manages departments" ON public.departments FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- BATCHES
DO $$ BEGIN
  DROP POLICY IF EXISTS "All authenticated view batches" ON public.batches;
  DROP POLICY IF EXISTS "Super admin manages batches" ON public.batches;
END $$;

CREATE POLICY "All authenticated view batches" ON public.batches FOR SELECT USING (true);
CREATE POLICY "Super admin manages batches" ON public.batches FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- ROOMS
DO $$ BEGIN
  DROP POLICY IF EXISTS "All authenticated view rooms" ON public.rooms;
  DROP POLICY IF EXISTS "Super admin manages rooms" ON public.rooms;
END $$;

CREATE POLICY "All authenticated view rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Super admin manages rooms" ON public.rooms FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- COURSES
DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated users view active courses" ON public.courses;
  DROP POLICY IF EXISTS "Super admin manages courses" ON public.courses;
  DROP POLICY IF EXISTS "Public can view active courses" ON public.courses;
END $$;

CREATE POLICY "Authenticated users view active courses" ON public.courses FOR SELECT TO authenticated USING (is_active = true OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin manages courses" ON public.courses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Public can view active courses" ON public.courses FOR SELECT TO anon USING (is_active = true);

-- TEACHER_COURSES
DO $$ BEGIN
  DROP POLICY IF EXISTS "View teacher courses" ON public.teacher_courses;
  DROP POLICY IF EXISTS "Super admin manages teacher_courses" ON public.teacher_courses;
  DROP POLICY IF EXISTS "Public can view teacher_courses" ON public.teacher_courses;
END $$;

CREATE POLICY "View teacher courses" ON public.teacher_courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manages teacher_courses" ON public.teacher_courses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Public can view teacher_courses" ON public.teacher_courses FOR SELECT TO anon USING (true);

-- ENROLLMENTS
DO $$ BEGIN
  DROP POLICY IF EXISTS "Students view own enrollments" ON public.enrollments;
  DROP POLICY IF EXISTS "Super admin manages enrollments" ON public.enrollments;
END $$;

CREATE POLICY "Students view own enrollments" ON public.enrollments FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Super admin manages enrollments" ON public.enrollments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- CLASSES
DO $$ BEGIN
  DROP POLICY IF EXISTS "Enrolled users view classes" ON public.classes;
  DROP POLICY IF EXISTS "Teachers manage own classes" ON public.classes;
END $$;

CREATE POLICY "Enrolled users view classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers manage own classes" ON public.classes FOR ALL TO authenticated USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- ATTENDANCE
DO $$ BEGIN
  DROP POLICY IF EXISTS "Students view own attendance" ON public.attendance;
  DROP POLICY IF EXISTS "Teachers manage attendance" ON public.attendance;
END $$;

CREATE POLICY "Students view own attendance" ON public.attendance FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Teachers manage attendance" ON public.attendance FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'super_admin'));

-- EXAM_SCHEDULES
DO $$ BEGIN
  DROP POLICY IF EXISTS "All authenticated view exams" ON public.exam_schedules;
  DROP POLICY IF EXISTS "Super admin manages exams" ON public.exam_schedules;
  DROP POLICY IF EXISTS "Public can view exam_schedules" ON public.exam_schedules;
END $$;

CREATE POLICY "All authenticated view exams" ON public.exam_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manages exams" ON public.exam_schedules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Public can view exam_schedules" ON public.exam_schedules FOR SELECT TO anon USING (true);

-- EXAM_RESULTS
DO $$ BEGIN
  DROP POLICY IF EXISTS "Students view own published results" ON public.exam_results;
  DROP POLICY IF EXISTS "Teachers manage results" ON public.exam_results;
END $$;

CREATE POLICY "Students view own published results" ON public.exam_results FOR SELECT TO authenticated USING (((student_id = auth.uid() AND is_published = true) OR public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "Teachers manage results" ON public.exam_results FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'super_admin'));

-- NOTICES
DO $$ BEGIN
  DROP POLICY IF EXISTS "All authenticated view notices" ON public.notices;
  DROP POLICY IF EXISTS "Admin and teachers post notices" ON public.notices;
  DROP POLICY IF EXISTS "Public can view notices" ON public.notices;
END $$;

CREATE POLICY "All authenticated view notices" ON public.notices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin and teachers post notices" ON public.notices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Public can view notices" ON public.notices FOR SELECT TO anon USING (true);

-- REQUESTS
DO $$ BEGIN
  DROP POLICY IF EXISTS "Students view own requests" ON public.requests;
  DROP POLICY IF EXISTS "Students create requests" ON public.requests;
  DROP POLICY IF EXISTS "Teachers update requests" ON public.requests;
END $$;

CREATE POLICY "Students view own requests" ON public.requests FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Students create requests" ON public.requests FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid() AND public.has_role(auth.uid(), 'student'));
CREATE POLICY "Teachers update requests" ON public.requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'super_admin'));

-- ASSESSMENTS
DO $$ BEGIN
  DROP POLICY IF EXISTS "Students view own assessments" ON public.assessments;
  DROP POLICY IF EXISTS "Teachers manage assessments" ON public.assessments;
END $$;

CREATE POLICY "Students view own assessments" ON public.assessments FOR SELECT TO authenticated USING (student_id = auth.uid() OR teacher_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Teachers manage assessments" ON public.assessments FOR ALL TO authenticated USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- NOTES
DO $$ BEGIN
  DROP POLICY IF EXISTS "Enrolled students view notes" ON public.notes;
  DROP POLICY IF EXISTS "Teachers manage notes" ON public.notes;
END $$;

CREATE POLICY "Enrolled students view notes" ON public.notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers manage notes" ON public.notes FOR ALL TO authenticated USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- SETTINGS
DO $$ BEGIN
  DROP POLICY IF EXISTS "All view settings" ON public.settings;
  DROP POLICY IF EXISTS "Super admin manages settings" ON public.settings;
  DROP POLICY IF EXISTS "Manager can manage settings" ON public.settings;
  DROP POLICY IF EXISTS "Manager can view settings" ON public.settings;
END $$;

CREATE POLICY "All view settings" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manages settings" ON public.settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Manager can manage settings" ON public.settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Manager can view settings" ON public.settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'));

-- ACADEMIC_SEMESTERS
DO $$ BEGIN
  DROP POLICY IF EXISTS "All authenticated view academic_semesters" ON public.academic_semesters;
  DROP POLICY IF EXISTS "Super admin manages academic_semesters" ON public.academic_semesters;
END $$;

CREATE POLICY "All authenticated view academic_semesters" ON public.academic_semesters FOR SELECT USING (true);
CREATE POLICY "Super admin manages academic_semesters" ON public.academic_semesters FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- ROUTINES
DO $$ BEGIN
  DROP POLICY IF EXISTS "All authenticated view routines" ON public.routines;
  DROP POLICY IF EXISTS "Super admin manages routines" ON public.routines;
END $$;

CREATE POLICY "All authenticated view routines" ON public.routines FOR SELECT USING (true);
CREATE POLICY "Super admin manages routines" ON public.routines FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- =============================================
-- 8. DEFAULT DATA
-- =============================================
INSERT INTO public.settings (key, value) VALUES
  ('portal_name', 'University Management Portal'),
  ('current_semester', 'Spring 2026'),
  ('academic_year', '2025-2026'),
  -- Feature visibility defaults (all enabled)
  ('vis_student_courses', 'true'),
  ('vis_student_attendance', 'true'),
  ('vis_student_schedule', 'true'),
  ('vis_student_exams', 'true'),
  ('vis_student_results', 'true'),
  ('vis_student_assessments', 'true'),
  ('vis_student_notices', 'true'),
  ('vis_student_requests', 'true'),
  ('vis_student_final_results', 'true'),
  ('vis_teacher_courses', 'true'),
  ('vis_teacher_attendance', 'true'),
  ('vis_teacher_schedule', 'true'),
  ('vis_teacher_assessments', 'true'),
  ('vis_teacher_notes', 'true'),
  ('vis_teacher_requests', 'true'),
  ('vis_teacher_results', 'true'),
  ('vis_admin_departments', 'true'),
  ('vis_admin_teachers', 'true'),
  ('vis_admin_students', 'true'),
  ('vis_admin_batches', 'true'),
  ('vis_admin_courses', 'true'),
  ('vis_admin_rooms', 'true'),
  ('vis_admin_routine', 'true'),
  ('vis_admin_notices', 'true'),
  ('vis_admin_schedule', 'true'),
  ('vis_admin_exams', 'true'),
  ('vis_admin_results', 'true'),
  ('vis_admin_settings', 'true')
ON CONFLICT (key) DO NOTHING;

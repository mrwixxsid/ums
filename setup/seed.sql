-- =============================================
-- SEED DATA: Departments, Batches, Rooms
-- =============================================
-- Run this AFTER schema.sql
-- Safe to re-run: uses ON CONFLICT DO NOTHING
-- =============================================

-- Department
INSERT INTO public.departments (name, code) VALUES
  ('Computer Science & Engineering', 'CSE')
ON CONFLICT (code) DO NOTHING;

-- Batches (8 semesters for CSE)
-- Uses a subquery to get department_id dynamically
DO $$
DECLARE
  dept_id UUID;
BEGIN
  SELECT id INTO dept_id FROM public.departments WHERE code = 'CSE';

  INSERT INTO public.batches (department_id, batch_name, year, semester, starting_roll, student_count, admission_session) VALUES
    (dept_id, 'CSE-2026-Jan-Y1S1', 2026, 1, 2601, 60, 'January'),
    (dept_id, 'CSE-2025-Jul-Y1S2', 2025, 2, 2501, 55, 'July'),
    (dept_id, 'CSE-2025-Jan-Y2S3', 2025, 3, 2502, 50, 'January'),
    (dept_id, 'CSE-2024-Jul-Y2S4', 2024, 4, 2401, 48, 'July'),
    (dept_id, 'CSE-2024-Jan-Y3S5', 2024, 5, 2402, 45, 'January'),
    (dept_id, 'CSE-2023-Jul-Y3S6', 2023, 6, 2301, 42, 'July'),
    (dept_id, 'CSE-2023-Jan-Y4S7', 2023, 7, 2302, 40, 'January'),
    (dept_id, 'CSE-2022-Jul-Y4S8', 2022, 8, 2201, 38, 'July')
  ON CONFLICT (starting_roll) DO NOTHING;
END $$;

-- Rooms
INSERT INTO public.rooms (number, type, capacity) VALUES
  ('101', 'Class', 60),
  ('102', 'Class', 60),
  ('103', 'Class', 40),
  ('Lab-1', 'Lab', 30),
  ('Lab-2', 'Lab', 30),
  ('Lab-3', 'Lab', 25)
ON CONFLICT DO NOTHING;

-- Default settings (if not already present)
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

-- =============================================
-- DATABASE VERIFICATION SCRIPT
-- =============================================
-- Paste this into Supabase SQL Editor and run it.
-- It checks that all required database objects exist.
-- Results show ✅ PASS or ❌ FAIL for each item.
-- =============================================

WITH checks AS (
  -- Tables (19 total)
  SELECT 'Table' AS type, 'profiles' AS name,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') AS ok
  UNION ALL
  SELECT 'Table', 'user_roles',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles')
  UNION ALL
  SELECT 'Table', 'departments',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'departments')
  UNION ALL
  SELECT 'Table', 'batches',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'batches')
  UNION ALL
  SELECT 'Table', 'rooms',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rooms')
  UNION ALL
  SELECT 'Table', 'courses',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses')
  UNION ALL
  SELECT 'Table', 'teacher_courses',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teacher_courses')
  UNION ALL
  SELECT 'Table', 'enrollments',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'enrollments')
  UNION ALL
  SELECT 'Table', 'classes',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'classes')
  UNION ALL
  SELECT 'Table', 'attendance',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance')
  UNION ALL
  SELECT 'Table', 'exam_schedules',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exam_schedules')
  UNION ALL
  SELECT 'Table', 'exam_results',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exam_results')
  UNION ALL
  SELECT 'Table', 'notices',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notices')
  UNION ALL
  SELECT 'Table', 'requests',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'requests')
  UNION ALL
  SELECT 'Table', 'assessments',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessments')
  UNION ALL
  SELECT 'Table', 'notes',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notes')
  UNION ALL
  SELECT 'Table', 'settings',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'settings')
  UNION ALL
  SELECT 'Table', 'academic_semesters',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'academic_semesters')
  UNION ALL
  SELECT 'Table', 'routines',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'routines')

  -- Enums (6 total)
  UNION ALL
  SELECT 'Enum', 'app_role',
    EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typnamespace = 'public'::regnamespace)
  UNION ALL
  SELECT 'Enum', 'attendance_status',
    EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status' AND typnamespace = 'public'::regnamespace)
  UNION ALL
  SELECT 'Enum', 'exam_type',
    EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exam_type' AND typnamespace = 'public'::regnamespace)
  UNION ALL
  SELECT 'Enum', 'notice_type',
    EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notice_type' AND typnamespace = 'public'::regnamespace)
  UNION ALL
  SELECT 'Enum', 'request_type',
    EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_type' AND typnamespace = 'public'::regnamespace)
  UNION ALL
  SELECT 'Enum', 'request_status',
    EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status' AND typnamespace = 'public'::regnamespace)

  -- Functions (4 total)
  UNION ALL
  SELECT 'Function', 'has_role',
    EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role' AND pronamespace = 'public'::regnamespace)
  UNION ALL
  SELECT 'Function', 'get_my_role',
    EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_my_role' AND pronamespace = 'public'::regnamespace)
  UNION ALL
  SELECT 'Function', 'handle_new_user',
    EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user' AND pronamespace = 'public'::regnamespace)
  UNION ALL
  SELECT 'Function', 'handle_updated_at',
    EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at' AND pronamespace = 'public'::regnamespace)

  -- Settings data
  UNION ALL
  SELECT 'Data', 'settings rows',
    (SELECT COUNT(*) >= 30 FROM public.settings)
)
SELECT
  type AS "Type",
  name AS "Name",
  CASE WHEN ok THEN '✅ PASS' ELSE '❌ FAIL' END AS "Status"
FROM checks
ORDER BY
  CASE type WHEN 'Table' THEN 1 WHEN 'Enum' THEN 2 WHEN 'Function' THEN 3 WHEN 'Data' THEN 4 END,
  name;


-- Fix enrollments.student_id: auth.users -> profiles
ALTER TABLE public.enrollments DROP CONSTRAINT enrollments_student_id_fkey;
ALTER TABLE public.enrollments
  ADD CONSTRAINT enrollments_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Fix exam_results.student_id: auth.users -> profiles
ALTER TABLE public.exam_results DROP CONSTRAINT exam_results_student_id_fkey;
ALTER TABLE public.exam_results
  ADD CONSTRAINT exam_results_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Fix teacher_courses.teacher_id: auth.users -> profiles
ALTER TABLE public.teacher_courses DROP CONSTRAINT teacher_courses_teacher_id_fkey;
ALTER TABLE public.teacher_courses
  ADD CONSTRAINT teacher_courses_teacher_id_fkey
  FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

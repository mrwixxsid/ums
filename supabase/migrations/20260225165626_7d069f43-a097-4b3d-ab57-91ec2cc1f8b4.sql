
-- Add unique constraint on enrollments for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_enrollment
ON public.enrollments (student_id, course_id);

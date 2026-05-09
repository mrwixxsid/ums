
-- Add unique constraint on attendance (class_id, student_id) for upsert support
ALTER TABLE public.attendance ADD CONSTRAINT attendance_class_student_unique UNIQUE (class_id, student_id);

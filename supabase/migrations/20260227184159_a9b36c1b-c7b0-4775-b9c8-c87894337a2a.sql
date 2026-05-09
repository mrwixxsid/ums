-- Drop duplicate unique constraints (keeping the original ones)
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_class_student_unique;
ALTER TABLE exam_results DROP CONSTRAINT IF EXISTS exam_results_exam_student_unique;
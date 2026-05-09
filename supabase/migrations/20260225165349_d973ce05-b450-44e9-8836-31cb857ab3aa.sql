
-- Add is_graduated column to batches
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS is_graduated BOOLEAN NOT NULL DEFAULT false;

-- Create partial unique index to prevent duplicate active batches per department+semester
CREATE UNIQUE INDEX idx_unique_active_batch_per_dept_semester
ON public.batches (department_id, semester)
WHERE is_graduated = false;

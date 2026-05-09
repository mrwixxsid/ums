
-- Academic Semesters table
CREATE TABLE public.academic_semesters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  start_date date NOT NULL,
  mid_exam_start date,
  mid_exam_end date,
  final_exam_start date,
  final_exam_end date,
  result_publish_date date,
  next_semester_start date,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.academic_semesters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated view academic_semesters" ON public.academic_semesters FOR SELECT USING (true);
CREATE POLICY "Super admin manages academic_semesters" ON public.academic_semesters FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add department_id to rooms
ALTER TABLE public.rooms ADD COLUMN department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

-- Add department_id FK and is_non_departmental to courses
ALTER TABLE public.courses ADD COLUMN department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;
ALTER TABLE public.courses ADD COLUMN is_non_departmental boolean NOT NULL DEFAULT false;

-- Routines table
CREATE TABLE public.routines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 4),
  period_number integer NOT NULL CHECK (period_number BETWEEN 1 AND 7),
  is_lab_continuation boolean NOT NULL DEFAULT false,
  lab_group integer,
  semester_id uuid REFERENCES public.academic_semesters(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated view routines" ON public.routines FOR SELECT USING (true);
CREATE POLICY "Super admin manages routines" ON public.routines FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Index for conflict detection queries
CREATE INDEX idx_routines_day_period ON public.routines(day_of_week, period_number);
CREATE INDEX idx_routines_teacher ON public.routines(teacher_id, day_of_week, period_number);
CREATE INDEX idx_routines_room ON public.routines(room_id, day_of_week, period_number);
CREATE INDEX idx_routines_batch ON public.routines(batch_id, day_of_week, period_number);

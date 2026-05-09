
-- Create departments table
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated view departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Super admin manages departments" ON public.departments FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create batches table
CREATE TABLE public.batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE NOT NULL,
  batch_name text NOT NULL,
  year integer NOT NULL,
  semester integer NOT NULL,
  starting_roll integer NOT NULL UNIQUE,
  student_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated view batches" ON public.batches FOR SELECT USING (true);
CREATE POLICY "Super admin manages batches" ON public.batches FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create rooms table
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL,
  type text DEFAULT 'Class',
  capacity integer DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated view rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Super admin manages rooms" ON public.rooms FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add batch_id and designation to profiles
ALTER TABLE public.profiles ADD COLUMN batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN designation text;

-- Add year, semester, course_type, contact_hours to courses
ALTER TABLE public.courses ADD COLUMN year integer;
ALTER TABLE public.courses ADD COLUMN semester_number integer;
ALTER TABLE public.courses ADD COLUMN course_type text;
ALTER TABLE public.courses ADD COLUMN contact_hours integer;

ALTER TABLE public.routines
ADD CONSTRAINT routines_teacher_id_fkey
FOREIGN KEY (teacher_id) REFERENCES public.profiles(id);
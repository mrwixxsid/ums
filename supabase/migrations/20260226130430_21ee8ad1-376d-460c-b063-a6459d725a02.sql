
-- Add anonymous SELECT policy on notices table
CREATE POLICY "Public can view notices"
  ON public.notices
  FOR SELECT
  TO anon
  USING (true);

-- Add anonymous SELECT policy on exam_schedules table
CREATE POLICY "Public can view exam_schedules"
  ON public.exam_schedules
  FOR SELECT
  TO anon
  USING (true);


-- Allow anonymous/public SELECT on profiles (for faculty directory)
CREATE POLICY "Public can view profiles"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous/public SELECT on user_roles (to identify teachers)
CREATE POLICY "Public can view user_roles"
  ON public.user_roles
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous/public SELECT on teacher_courses
CREATE POLICY "Public can view teacher_courses"
  ON public.teacher_courses
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous/public SELECT on courses (active only)
CREATE POLICY "Public can view active courses"
  ON public.courses
  FOR SELECT
  TO anon
  USING (is_active = true);

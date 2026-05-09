
-- Create storage bucket for teacher note attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('note-files', 'note-files', true);

-- Allow authenticated users to view note files
CREATE POLICY "Anyone can view note files"
ON storage.objects FOR SELECT
USING (bucket_id = 'note-files');

-- Teachers can upload note files
CREATE POLICY "Teachers can upload note files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'note-files'
  AND public.has_role(auth.uid(), 'teacher'::public.app_role)
);

-- Teachers can update their own note files
CREATE POLICY "Teachers can update own note files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'note-files'
  AND public.has_role(auth.uid(), 'teacher'::public.app_role)
);

-- Teachers can delete their own note files
CREATE POLICY "Teachers can delete own note files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'note-files'
  AND public.has_role(auth.uid(), 'teacher'::public.app_role)
);

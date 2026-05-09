-- Allow manager to view and manage settings (for Feature Control)
CREATE POLICY "Manager can view settings"
ON public.settings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Manager can manage settings"
ON public.settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));
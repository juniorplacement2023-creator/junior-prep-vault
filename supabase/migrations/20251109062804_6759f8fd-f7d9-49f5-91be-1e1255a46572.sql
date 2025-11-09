-- Allow mentors to delete their own resources
CREATE POLICY "Mentors can delete own resources"
ON public.resources
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (has_role(auth.uid(), 'mentor'::app_role) AND uploaded_by = auth.uid())
);
-- Add company_id column to resources table to support NULL for general resources
ALTER TABLE public.resources ALTER COLUMN company_id DROP NOT NULL;

-- Add a new category type for general resources
CREATE TYPE public.resource_category AS ENUM ('aptitude', 'coding', 'technical', 'hr', 'general', 'communication', 'resume', 'other');

-- Add category column to resources
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS category resource_category DEFAULT 'other';

-- Add folder_path for organizing general resources
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS folder_path text;

-- Update RLS policies to allow mentors to delete announcements
DROP POLICY IF EXISTS "Mentors and admins can manage announcements" ON public.announcements;

CREATE POLICY "Mentors and admins can manage announcements"
ON public.announcements
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'mentor'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'mentor'::app_role));

-- Add resource analytics table
CREATE TABLE IF NOT EXISTS public.resource_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid REFERENCES public.resources(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL, -- 'view', 'download', 'bookmark'
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.resource_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics"
ON public.resource_analytics
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Mentors and admins can view analytics"
ON public.resource_analytics
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'mentor'::app_role));
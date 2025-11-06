-- Fix forum_posts and forum_replies foreign keys to reference profiles instead of auth.users
-- Drop existing tables and recreate with correct foreign keys
DROP TABLE IF EXISTS public.forum_replies CASCADE;
DROP TABLE IF EXISTS public.forum_posts CASCADE;

-- Create forum_posts table with correct foreign key
CREATE TABLE public.forum_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create forum_replies table with correct foreign key
CREATE TABLE public.forum_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for forum_posts
CREATE POLICY "Anyone can view forum posts"
  ON public.forum_posts
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON public.forum_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own posts"
  ON public.forum_posts
  FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Users and mentors can delete posts"
  ON public.forum_posts
  FOR DELETE
  USING (auth.uid() = author_id OR has_role(auth.uid(), 'mentor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for forum_replies
CREATE POLICY "Anyone can view forum replies"
  ON public.forum_replies
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create replies"
  ON public.forum_replies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own replies"
  ON public.forum_replies
  FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Users and mentors can delete replies"
  ON public.forum_replies
  FOR DELETE
  USING (auth.uid() = author_id OR has_role(auth.uid(), 'mentor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
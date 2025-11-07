-- Add is_active column to profiles table
ALTER TABLE public.profiles
ADD COLUMN is_active boolean DEFAULT true NOT NULL;

-- Update the handle_new_user function to set is_active to true by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    true
  );
  
  -- Assign 'junior' role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'junior');
  
  RETURN NEW;
END;
$function$;

-- Create function to check if user is active
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT is_active FROM public.profiles WHERE id = _user_id),
    false
  )
$function$;

-- Update profiles RLS policies to allow admins to update is_active
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));
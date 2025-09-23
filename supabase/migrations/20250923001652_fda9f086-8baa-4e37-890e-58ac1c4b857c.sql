-- Fix security issue: Ensure profiles table RLS policies require authentication
-- Drop and recreate policies with explicit authentication checks

-- Fix profiles table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = id);
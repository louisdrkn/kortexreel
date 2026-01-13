-- Add user_id column to projects table
ALTER TABLE public.projects 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to project_data table
ALTER TABLE public.project_data 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on projects" ON public.projects;
DROP POLICY IF EXISTS "Allow all operations on project_data" ON public.project_data;

-- Create secure RLS policies for projects
CREATE POLICY "Users can view own projects"
ON public.projects
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
ON public.projects
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create secure RLS policies for project_data
CREATE POLICY "Users can view own project_data"
ON public.project_data
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own project_data"
ON public.project_data
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own project_data"
ON public.project_data
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own project_data"
ON public.project_data
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
-- Add target_url to projects for state persistence
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS target_url TEXT;

-- Index for faster alignment checks
CREATE INDEX IF NOT EXISTS idx_projects_target_url ON public.projects(target_url);

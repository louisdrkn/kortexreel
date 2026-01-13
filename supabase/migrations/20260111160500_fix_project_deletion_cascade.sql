-- Migration: Fix Project Deletion (Cascade)
-- Description: Ensures all project-related data is deleted when a project is removed.

-- 1. Fix company_documents: Add missing foreign key with CASCADE
DO $$
BEGIN
    -- Check if FK exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'company_documents_project_id_fkey'
    ) THEN
        ALTER TABLE public.company_documents
        ADD CONSTRAINT company_documents_project_id_fkey
        FOREIGN KEY (project_id)
        REFERENCES public.projects(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Ensure leads table uses CASCADE instead of SET NULL (Optional but recommended for clean deletion)
ALTER TABLE public.leads
DROP CONSTRAINT IF EXISTS leads_project_id_fkey,
ADD CONSTRAINT leads_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES public.projects(id)
ON DELETE CASCADE;

-- 3. Note: The following tables already have CASCADE in migrations, 
-- but we repeat it here to be absolutely sure in case of manual schema changes.
-- project_data, company_analyses, lead_interactions, learned_preferences, research_jobs

ALTER TABLE public.project_data
DROP CONSTRAINT IF EXISTS project_data_project_id_fkey,
ADD CONSTRAINT project_data_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES public.projects(id)
ON DELETE CASCADE;

ALTER TABLE public.company_analyses
DROP CONSTRAINT IF EXISTS company_analyses_project_id_fkey,
ADD CONSTRAINT company_analyses_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES public.projects(id)
ON DELETE CASCADE;

ALTER TABLE public.lead_interactions
DROP CONSTRAINT IF EXISTS lead_interactions_project_id_fkey,
ADD CONSTRAINT lead_interactions_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES public.projects(id)
ON DELETE CASCADE;

ALTER TABLE public.learned_preferences
DROP CONSTRAINT IF EXISTS learned_preferences_project_id_fkey,
ADD CONSTRAINT learned_preferences_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES public.projects(id)
ON DELETE CASCADE;

ALTER TABLE public.research_jobs
DROP CONSTRAINT IF EXISTS research_jobs_project_id_fkey,
ADD CONSTRAINT research_jobs_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES public.projects(id)
ON DELETE CASCADE;

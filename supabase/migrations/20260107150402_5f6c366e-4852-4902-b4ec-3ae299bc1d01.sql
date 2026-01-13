-- Ensure upserts work for Radar discoveries
-- Needed because the Edge Function uses onConflict: "project_id,company_url"
CREATE UNIQUE INDEX IF NOT EXISTS company_analyses_project_company_url_uidx
ON public.company_analyses (project_id, company_url);

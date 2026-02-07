-- Migration to add Commercial Briefing columns
ALTER TABLE public.company_analyses
ADD COLUMN IF NOT EXISTS sales_thesis TEXT,
ADD COLUMN IF NOT EXISTS trigger_events JSONB DEFAULT '[]'::jsonb;

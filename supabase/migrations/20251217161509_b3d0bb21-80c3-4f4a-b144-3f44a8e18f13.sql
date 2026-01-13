-- Add deep analysis columns to store company intelligence
-- Using project_data table with a new data_type 'company_analysis' for flexibility

-- Create a dedicated table for company deep analysis results
CREATE TABLE public.company_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  company_url TEXT,
  
  -- Basic info
  logo_url TEXT,
  industry TEXT,
  headcount TEXT,
  location TEXT,
  
  -- Deep analysis fields
  description_long TEXT,
  detected_pain_points JSONB DEFAULT '[]'::jsonb,
  strategic_analysis TEXT,
  buying_signals JSONB DEFAULT '[]'::jsonb,
  key_urls JSONB DEFAULT '{}'::jsonb,
  custom_hook TEXT,
  
  -- Scoring
  match_score INTEGER DEFAULT 0,
  match_explanation TEXT,
  
  -- Analysis status
  analysis_status TEXT DEFAULT 'pending',
  analyzed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint per project/company
  UNIQUE(project_id, company_url)
);

-- Enable RLS
ALTER TABLE public.company_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own company analyses"
  ON public.company_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own company analyses"
  ON public.company_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own company analyses"
  ON public.company_analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own company analyses"
  ON public.company_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_company_analyses_updated_at
  BEFORE UPDATE ON public.company_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_analyses;
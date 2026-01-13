-- Table pour tracker les jobs de recherche en arrière-plan
CREATE TABLE public.research_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_step TEXT,
  step_details JSONB DEFAULT '{}'::jsonb,
  results JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Index pour lookup rapide par projet
CREATE INDEX idx_research_jobs_project ON public.research_jobs(project_id);
CREATE INDEX idx_research_jobs_status ON public.research_jobs(status);

-- Enable RLS
ALTER TABLE public.research_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own research jobs" ON public.research_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own research jobs" ON public.research_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own research jobs" ON public.research_jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own research jobs" ON public.research_jobs
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger pour updated_at
CREATE TRIGGER update_research_jobs_updated_at
  BEFORE UPDATE ON public.research_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Realtime pour cette table
ALTER PUBLICATION supabase_realtime ADD TABLE public.research_jobs;
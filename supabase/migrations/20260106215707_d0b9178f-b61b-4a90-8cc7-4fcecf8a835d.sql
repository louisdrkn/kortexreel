-- Table pour tracker les interactions utilisateur sur les leads
CREATE TABLE public.lead_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.company_analyses(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('viewed', 'rejected', 'validated', 'shortlisted')),
  duration_ms INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les requêtes rapides
CREATE INDEX idx_lead_interactions_user_project ON public.lead_interactions(user_id, project_id);
CREATE INDEX idx_lead_interactions_action ON public.lead_interactions(action);
CREATE INDEX idx_lead_interactions_created ON public.lead_interactions(created_at DESC);

-- Enable RLS
ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own interactions"
ON public.lead_interactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interactions"
ON public.lead_interactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interactions"
ON public.lead_interactions FOR DELETE
USING (auth.uid() = user_id);

-- Table pour stocker les préférences apprises par projet
CREATE TABLE public.learned_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL,
  sector_weights JSONB DEFAULT '{}',
  size_weights JSONB DEFAULT '{}',
  technology_weights JSONB DEFAULT '{}',
  keyword_boosts JSONB DEFAULT '{}',
  excluded_patterns JSONB DEFAULT '[]',
  last_calibrated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.learned_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own preferences"
ON public.learned_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.learned_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.learned_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger pour updated_at
CREATE TRIGGER update_learned_preferences_updated_at
BEFORE UPDATE ON public.learned_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- =============================================
-- KORTEX MULTI-TENANT DATABASE ARCHITECTURE
-- =============================================

-- 1. SUBSCRIPTION TIER ENUM
CREATE TYPE public.subscription_tier AS ENUM ('free', 'starter', 'empire');

-- 2. ORGANIZATION ROLE ENUM
CREATE TYPE public.org_role AS ENUM ('admin', 'viewer');

-- 3. AGENT ARCHETYPE ENUM
CREATE TYPE public.agent_archetype AS ENUM ('SDR', 'RESEARCHER', 'COPYWRITER');

-- 4. AGENT STATUS ENUM
CREATE TYPE public.agent_status AS ENUM ('active', 'paused', 'training');

-- 5. LEAD PIPELINE STAGE ENUM
CREATE TYPE public.pipeline_stage AS ENUM ('detected', 'enriched', 'contacted', 'negotiation', 'closed');

-- 6. TASK TYPE ENUM
CREATE TYPE public.task_type AS ENUM ('send_email', 'send_linkedin', 'scrape', 'analyze', 'enrich');

-- 7. TASK STATUS ENUM
CREATE TYPE public.task_status AS ENUM ('pending', 'running', 'done', 'failed');

-- =============================================
-- TABLE 1: ORGANIZATIONS (Multi-Tenancy Root)
-- =============================================
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subscription_tier subscription_tier NOT NULL DEFAULT 'free',
    resources_limit JSONB NOT NULL DEFAULT '{"agents": 1, "leads_per_month": 100, "messages_per_month": 500}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- TABLE 2: PROFILES (Linked to auth.users)
-- =============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- TABLE 3: USER ROLES (Separate table for security)
-- =============================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role org_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, org_id)
);

-- =============================================
-- TABLE 4: VIRTUAL AGENTS
-- =============================================
CREATE TABLE public.virtual_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    archetype agent_archetype NOT NULL DEFAULT 'SDR',
    status agent_status NOT NULL DEFAULT 'training',
    personality_prompt TEXT,
    memory JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- TABLE 5: LEADS
-- =============================================
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_name TEXT,
    linkedin_data JSONB DEFAULT '{}'::jsonb,
    contact_info JSONB DEFAULT '{}'::jsonb,
    qualification_score INT DEFAULT 0 CHECK (qualification_score >= 0 AND qualification_score <= 100),
    pipeline_stage pipeline_stage NOT NULL DEFAULT 'detected',
    assigned_agent_id UUID REFERENCES public.virtual_agents(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- TABLE 6: MISSIONS
-- =============================================
CREATE TABLE public.missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    strategy_prompt TEXT,
    target_criteria JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    stats JSONB DEFAULT '{"contacted": 0, "opened": 0, "replied": 0, "meetings": 0}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- TABLE 7: TASKS
-- =============================================
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    mission_id UUID REFERENCES public.missions(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.virtual_agents(id) ON DELETE SET NULL,
    type task_type NOT NULL,
    status task_status NOT NULL DEFAULT 'pending',
    payload JSONB DEFAULT '{}'::jsonb,
    result JSONB DEFAULT '{}'::jsonb,
    scheduled_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- SECURITY DEFINER FUNCTIONS (Avoid RLS Recursion)
-- =============================================

-- Function to get user's org_id
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT org_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- Function to check if user has role in org
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id UUID, _org_id UUID, _role org_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND org_id = _org_id AND role = _role
    )
$$;

-- Function to check if user belongs to org
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = _user_id AND org_id = _org_id
    )
$$;

-- =============================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =============================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES: ORGANIZATIONS
-- =============================================
CREATE POLICY "Users can view their organization"
ON public.organizations FOR SELECT
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), id));

CREATE POLICY "Admins can update their organization"
ON public.organizations FOR UPDATE
TO authenticated
USING (public.has_org_role(auth.uid(), id, 'admin'))
WITH CHECK (public.has_org_role(auth.uid(), id, 'admin'));

-- =============================================
-- RLS POLICIES: PROFILES
-- =============================================
CREATE POLICY "Users can view profiles in their org"
ON public.profiles FOR SELECT
TO authenticated
USING (
    org_id IS NULL 
    OR org_id = public.get_user_org_id(auth.uid())
    OR id = auth.uid()
);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- =============================================
-- RLS POLICIES: USER_ROLES
-- =============================================
CREATE POLICY "Users can view roles in their org"
ON public.user_roles FOR SELECT
TO authenticated
USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admins can manage roles in their org"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_org_role(auth.uid(), org_id, 'admin'))
WITH CHECK (public.has_org_role(auth.uid(), org_id, 'admin'));

-- =============================================
-- RLS POLICIES: VIRTUAL_AGENTS
-- =============================================
CREATE POLICY "Users can view agents in their org"
ON public.virtual_agents FOR SELECT
TO authenticated
USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admins can manage agents in their org"
ON public.virtual_agents FOR ALL
TO authenticated
USING (public.has_org_role(auth.uid(), org_id, 'admin'))
WITH CHECK (public.has_org_role(auth.uid(), org_id, 'admin'));

-- =============================================
-- RLS POLICIES: LEADS
-- =============================================
CREATE POLICY "Users can view leads in their org"
ON public.leads FOR SELECT
TO authenticated
USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Users can insert leads in their org"
ON public.leads FOR INSERT
TO authenticated
WITH CHECK (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Users can update leads in their org"
ON public.leads FOR UPDATE
TO authenticated
USING (org_id = public.get_user_org_id(auth.uid()))
WITH CHECK (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admins can delete leads in their org"
ON public.leads FOR DELETE
TO authenticated
USING (public.has_org_role(auth.uid(), org_id, 'admin'));

-- =============================================
-- RLS POLICIES: MISSIONS
-- =============================================
CREATE POLICY "Users can view missions in their org"
ON public.missions FOR SELECT
TO authenticated
USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Users can manage missions in their org"
ON public.missions FOR ALL
TO authenticated
USING (org_id = public.get_user_org_id(auth.uid()))
WITH CHECK (org_id = public.get_user_org_id(auth.uid()));

-- =============================================
-- RLS POLICIES: TASKS
-- =============================================
CREATE POLICY "Users can view tasks in their org"
ON public.tasks FOR SELECT
TO authenticated
USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Users can manage tasks in their org"
ON public.tasks FOR ALL
TO authenticated
USING (org_id = public.get_user_org_id(auth.uid()))
WITH CHECK (org_id = public.get_user_org_id(auth.uid()));

-- =============================================
-- TRIGGERS: AUTO-UPDATE updated_at
-- =============================================
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_virtual_agents_updated_at
BEFORE UPDATE ON public.virtual_agents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_missions_updated_at
BEFORE UPDATE ON public.missions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TRIGGER: AUTO-CREATE PROFILE ON USER SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_profiles_org_id ON public.profiles(org_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_org_id ON public.user_roles(org_id);
CREATE INDEX idx_virtual_agents_org_id ON public.virtual_agents(org_id);
CREATE INDEX idx_leads_org_id ON public.leads(org_id);
CREATE INDEX idx_leads_pipeline_stage ON public.leads(pipeline_stage);
CREATE INDEX idx_leads_assigned_agent ON public.leads(assigned_agent_id);
CREATE INDEX idx_missions_org_id ON public.missions(org_id);
CREATE INDEX idx_tasks_org_id ON public.tasks(org_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_lead_id ON public.tasks(lead_id);
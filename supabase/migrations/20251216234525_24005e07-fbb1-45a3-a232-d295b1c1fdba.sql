-- =============================================
-- KORTEX SECURITY & AUTOMATION LAYER
-- =============================================

-- 1. ADD CREDITS COLUMN TO ORGANIZATIONS
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS credits_balance INT NOT NULL DEFAULT 0;

-- =============================================
-- 2. ENHANCED RLS POLICIES (Data Isolation)
-- =============================================

-- Drop existing policies to recreate with better logic
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can view agents in their org" ON public.virtual_agents;
DROP POLICY IF EXISTS "Admins can manage agents in their org" ON public.virtual_agents;
DROP POLICY IF EXISTS "Users can view leads in their org" ON public.leads;
DROP POLICY IF EXISTS "Users can insert leads in their org" ON public.leads;
DROP POLICY IF EXISTS "Users can update leads in their org" ON public.leads;
DROP POLICY IF EXISTS "Admins can delete leads in their org" ON public.leads;
DROP POLICY IF EXISTS "Users can view missions in their org" ON public.missions;
DROP POLICY IF EXISTS "Users can manage missions in their org" ON public.missions;
DROP POLICY IF EXISTS "Users can view tasks in their org" ON public.tasks;
DROP POLICY IF EXISTS "Users can manage tasks in their org" ON public.tasks;

-- Helper function: Check if user is platform admin/support
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.profiles p ON p.id = ur.user_id
        WHERE ur.user_id = _user_id 
        AND ur.role = 'admin'
        AND p.org_id IS NULL  -- Platform admin has no org (global access)
    )
$$;

-- =============================================
-- ORGANIZATIONS POLICIES
-- =============================================
CREATE POLICY "org_select_own"
ON public.organizations FOR SELECT
TO authenticated
USING (
    public.user_belongs_to_org(auth.uid(), id)
    OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "org_update_admin"
ON public.organizations FOR UPDATE
TO authenticated
USING (
    public.has_org_role(auth.uid(), id, 'admin')
    OR public.is_platform_admin(auth.uid())
)
WITH CHECK (
    public.has_org_role(auth.uid(), id, 'admin')
    OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "org_insert_authenticated"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (true);  -- Controlled by trigger on signup

-- =============================================
-- VIRTUAL_AGENTS POLICIES
-- =============================================
CREATE POLICY "agents_select_own_org"
ON public.virtual_agents FOR SELECT
TO authenticated
USING (
    org_id = public.get_user_org_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "agents_insert_own_org"
ON public.virtual_agents FOR INSERT
TO authenticated
WITH CHECK (
    org_id = public.get_user_org_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "agents_update_own_org"
ON public.virtual_agents FOR UPDATE
TO authenticated
USING (
    org_id = public.get_user_org_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
)
WITH CHECK (
    org_id = public.get_user_org_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "agents_delete_admin_only"
ON public.virtual_agents FOR DELETE
TO authenticated
USING (
    public.has_org_role(auth.uid(), org_id, 'admin')
    OR public.is_platform_admin(auth.uid())
);

-- =============================================
-- LEADS POLICIES
-- =============================================
CREATE POLICY "leads_select_own_org"
ON public.leads FOR SELECT
TO authenticated
USING (
    org_id = public.get_user_org_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "leads_insert_own_org"
ON public.leads FOR INSERT
TO authenticated
WITH CHECK (
    org_id = public.get_user_org_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "leads_update_own_org"
ON public.leads FOR UPDATE
TO authenticated
USING (
    org_id = public.get_user_org_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
)
WITH CHECK (
    org_id = public.get_user_org_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "leads_delete_admin_only"
ON public.leads FOR DELETE
TO authenticated
USING (
    public.has_org_role(auth.uid(), org_id, 'admin')
    OR public.is_platform_admin(auth.uid())
);

-- =============================================
-- MISSIONS POLICIES
-- =============================================
CREATE POLICY "missions_select_own_org"
ON public.missions FOR SELECT
TO authenticated
USING (
    org_id = public.get_user_org_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "missions_insert_own_org"
ON public.missions FOR INSERT
TO authenticated
WITH CHECK (
    org_id = public.get_user_org_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "missions_update_own_org"
ON public.missions FOR UPDATE
TO authenticated
USING (
    org_id = public.get_user_org_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
)
WITH CHECK (
    org_id = public.get_user_org_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "missions_delete_admin_only"
ON public.missions FOR DELETE
TO authenticated
USING (
    public.has_org_role(auth.uid(), org_id, 'admin')
    OR public.is_platform_admin(auth.uid())
);

-- =============================================
-- TASKS POLICIES
-- =============================================
CREATE POLICY "tasks_select_own_org"
ON public.tasks FOR SELECT
TO authenticated
USING (
    org_id = public.get_user_org_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "tasks_insert_own_org"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (
    org_id = public.get_user_org_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "tasks_update_own_org"
ON public.tasks FOR UPDATE
TO authenticated
USING (
    org_id = public.get_user_org_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
)
WITH CHECK (
    org_id = public.get_user_org_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "tasks_delete_own_org"
ON public.tasks FOR DELETE
TO authenticated
USING (
    org_id = public.get_user_org_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
);

-- =============================================
-- 3. CREDIT CONSUMPTION FUNCTION (RPC)
-- =============================================
CREATE OR REPLACE FUNCTION public.consume_resources(
    p_org_id UUID,
    p_amount INT,
    p_resource_type TEXT DEFAULT 'credits'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_balance INT;
    v_is_admin BOOLEAN;
    v_user_org_id UUID;
BEGIN
    -- Security: Verify caller belongs to this org
    SELECT org_id INTO v_user_org_id 
    FROM public.profiles 
    WHERE id = auth.uid();
    
    IF v_user_org_id IS NULL OR v_user_org_id != p_org_id THEN
        -- Check if platform admin
        IF NOT public.is_platform_admin(auth.uid()) THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'ACCESS_DENIED',
                'message', 'You do not have access to this organization'
            );
        END IF;
    END IF;
    
    -- Check if user is org admin (admins get free resources)
    SELECT public.has_org_role(auth.uid(), p_org_id, 'admin') INTO v_is_admin;
    
    IF v_is_admin OR public.is_platform_admin(auth.uid()) THEN
        -- Admin bypass: don't consume credits
        RETURN jsonb_build_object(
            'success', true,
            'bypass', true,
            'message', 'Admin bypass - no credits consumed'
        );
    END IF;
    
    -- Get current balance
    SELECT credits_balance INTO v_current_balance
    FROM public.organizations
    WHERE id = p_org_id
    FOR UPDATE;  -- Lock row for update
    
    IF v_current_balance IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ORG_NOT_FOUND',
            'message', 'Organization not found'
        );
    END IF;
    
    -- Check sufficient balance
    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INSUFFICIENT_CREDITS',
            'message', 'Not enough credits',
            'current_balance', v_current_balance,
            'required', p_amount
        );
    END IF;
    
    -- Consume credits
    UPDATE public.organizations
    SET credits_balance = credits_balance - p_amount,
        updated_at = now()
    WHERE id = p_org_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'consumed', p_amount,
        'new_balance', v_current_balance - p_amount,
        'resource_type', p_resource_type
    );
END;
$$;

-- Function to add credits (for purchases/admin)
CREATE OR REPLACE FUNCTION public.add_credits(
    p_org_id UUID,
    p_amount INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_balance INT;
BEGIN
    -- Only org admins or platform admins can add credits
    IF NOT (
        public.has_org_role(auth.uid(), p_org_id, 'admin') 
        OR public.is_platform_admin(auth.uid())
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ACCESS_DENIED',
            'message', 'Only admins can add credits'
        );
    END IF;
    
    UPDATE public.organizations
    SET credits_balance = credits_balance + p_amount,
        updated_at = now()
    WHERE id = p_org_id
    RETURNING credits_balance INTO v_new_balance;
    
    IF v_new_balance IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ORG_NOT_FOUND'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'added', p_amount,
        'new_balance', v_new_balance
    );
END;
$$;

-- =============================================
-- 4. AUTO-ASSIGN AGENT TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION public.auto_assign_agent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_agent_id UUID;
BEGIN
    -- Only process new leads without assigned agent
    IF NEW.assigned_agent_id IS NULL THEN
        -- Find an active RESEARCHER agent in this org
        SELECT id INTO v_agent_id
        FROM public.virtual_agents
        WHERE org_id = NEW.org_id
          AND archetype = 'RESEARCHER'
          AND status = 'active'
        ORDER BY created_at ASC
        LIMIT 1;
        
        -- If found, assign and update stage
        IF v_agent_id IS NOT NULL THEN
            NEW.assigned_agent_id := v_agent_id;
            NEW.pipeline_stage := 'detected';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_assign_agent ON public.leads;
CREATE TRIGGER trigger_auto_assign_agent
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_agent();

-- =============================================
-- 5. ENHANCED ONBOARDING TRIGGER
-- =============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_full_name TEXT;
BEGIN
    -- Extract full name from metadata
    v_full_name := COALESCE(
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'name',
        split_part(NEW.email, '@', 1)
    );
    
    -- 1. Create organization with welcome credits
    INSERT INTO public.organizations (
        name,
        subscription_tier,
        credits_balance,
        resources_limit
    ) VALUES (
        v_full_name || '''s Organization',
        'free',
        500,  -- Welcome credits
        '{"agents": 3, "leads_per_month": 100, "messages_per_month": 500}'::jsonb
    )
    RETURNING id INTO v_org_id;
    
    -- 2. Create profile linked to org
    INSERT INTO public.profiles (
        id,
        org_id,
        full_name,
        avatar_url
    ) VALUES (
        NEW.id,
        v_org_id,
        v_full_name,
        NEW.raw_user_meta_data ->> 'avatar_url'
    );
    
    -- 3. Assign admin role to the creator
    INSERT INTO public.user_roles (
        user_id,
        org_id,
        role
    ) VALUES (
        NEW.id,
        v_org_id,
        'admin'
    );
    
    -- 4. Create default virtual agents
    INSERT INTO public.virtual_agents (org_id, name, archetype, status, personality_prompt, memory) VALUES
    (
        v_org_id,
        'Chasseur',
        'SDR',
        'active',
        'Tu es un SDR agressif et tenace. Tu cherches à décrocher des RDV.',
        '{"specialization": "outbound", "style": "direct"}'::jsonb
    ),
    (
        v_org_id,
        'Stratège',
        'RESEARCHER',
        'active',
        'Tu analyses les prospects en profondeur pour trouver des angles d''attaque.',
        '{"specialization": "research", "style": "analytical"}'::jsonb
    ),
    (
        v_org_id,
        'Closer',
        'COPYWRITER',
        'training',
        'Tu rédiges des messages de relance et des propositions commerciales.',
        '{"specialization": "closing", "style": "persuasive"}'::jsonb
    );
    
    RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 6. UTILITY FUNCTIONS
-- =============================================

-- Get organization stats
CREATE OR REPLACE FUNCTION public.get_org_stats(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Security check
    IF NOT (
        public.user_belongs_to_org(auth.uid(), p_org_id)
        OR public.is_platform_admin(auth.uid())
    ) THEN
        RETURN jsonb_build_object('error', 'ACCESS_DENIED');
    END IF;
    
    SELECT jsonb_build_object(
        'leads_count', (SELECT COUNT(*) FROM public.leads WHERE org_id = p_org_id),
        'leads_by_stage', (
            SELECT jsonb_object_agg(pipeline_stage, cnt)
            FROM (
                SELECT pipeline_stage, COUNT(*) as cnt
                FROM public.leads
                WHERE org_id = p_org_id
                GROUP BY pipeline_stage
            ) sub
        ),
        'active_agents', (SELECT COUNT(*) FROM public.virtual_agents WHERE org_id = p_org_id AND status = 'active'),
        'active_missions', (SELECT COUNT(*) FROM public.missions WHERE org_id = p_org_id AND status = 'active'),
        'pending_tasks', (SELECT COUNT(*) FROM public.tasks WHERE org_id = p_org_id AND status = 'pending'),
        'credits_balance', (SELECT credits_balance FROM public.organizations WHERE id = p_org_id)
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;
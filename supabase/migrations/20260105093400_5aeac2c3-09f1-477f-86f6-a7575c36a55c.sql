-- P0 FIX: Create ensure_user_org RPC for self-healing

-- Idempotent self-healing function: creates org/profile/role when missing
CREATE OR REPLACE FUNCTION public.ensure_user_org()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_full_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- If profile exists and already has org_id, return it
  SELECT org_id INTO v_org_id
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_org_id IS NOT NULL THEN
    RETURN v_org_id;
  END IF;

  -- Get user info from auth.users
  SELECT COALESCE(
    raw_user_meta_data ->> 'full_name',
    raw_user_meta_data ->> 'name',
    split_part(email, '@', 1)
  ) INTO v_full_name
  FROM auth.users
  WHERE id = v_user_id;

  -- Create organization
  INSERT INTO public.organizations (name, credits_balance, subscription_tier, resources_limit)
  VALUES (COALESCE(v_full_name, 'User') || '''s Organization', 500, 'free', '{"agents": 3, "leads_per_month": 100, "messages_per_month": 500}'::jsonb)
  RETURNING id INTO v_org_id;

  -- Upsert profile
  INSERT INTO public.profiles (id, org_id, full_name)
  VALUES (v_user_id, v_org_id, v_full_name)
  ON CONFLICT (id) DO UPDATE SET org_id = v_org_id, updated_at = now();

  -- Ensure role exists
  INSERT INTO public.user_roles (user_id, org_id, role)
  VALUES (v_user_id, v_org_id, 'admin'::org_role)
  ON CONFLICT DO NOTHING;

  -- Create default virtual agents
  INSERT INTO public.virtual_agents (org_id, name, archetype, status, personality_prompt, memory) VALUES
  (v_org_id, 'Chasseur', 'SDR', 'active', 'Tu es un SDR agressif et tenace.', '{"specialization": "outbound"}'::jsonb),
  (v_org_id, 'Stratège', 'RESEARCHER', 'active', 'Tu analyses les prospects en profondeur.', '{"specialization": "research"}'::jsonb),
  (v_org_id, 'Closer', 'COPYWRITER', 'training', 'Tu rédiges des messages de relance.', '{"specialization": "closing"}'::jsonb);

  RETURN v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_user_org() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_user_org() TO authenticated;

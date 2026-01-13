-- Attach leads to projects to prevent "prospects orphelins"

-- 1) Add project_id column (nullable for backward compatibility)
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS project_id uuid;

-- 2) Optional FK to projects (safe with nullable)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leads_project_id_fkey'
  ) THEN
    ALTER TABLE public.leads
    ADD CONSTRAINT leads_project_id_fkey
    FOREIGN KEY (project_id)
    REFERENCES public.projects(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- 3) Index for list queries
CREATE INDEX IF NOT EXISTS idx_leads_project_id_created_at
ON public.leads (project_id, created_at DESC);

-- 4) Harden INSERT RLS: require a project_id that belongs to the signed-in user
DROP POLICY IF EXISTS "leads_insert_own_org" ON public.leads;

CREATE POLICY "leads_insert_own_org"
ON public.leads
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  (
    (org_id = public.get_user_org_id(auth.uid()))
    OR public.is_platform_admin(auth.uid())
  )
  AND project_id IS NOT NULL
  AND (
    project_id IN (
      SELECT p.id
      FROM public.projects p
      WHERE p.user_id = auth.uid()
    )
    OR public.is_platform_admin(auth.uid())
  )
);

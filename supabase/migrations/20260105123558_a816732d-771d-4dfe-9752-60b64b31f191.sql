-- Fix: Rendre la policy INSERT permissive (au lieu de restrictive)
-- D'abord supprimer l'ancienne, puis recréer en PERMISSIVE

DROP POLICY IF EXISTS "leads_insert_own_org" ON public.leads;

CREATE POLICY "leads_insert_own_org"
ON public.leads
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  (org_id = public.get_user_org_id(auth.uid())) 
  OR public.is_platform_admin(auth.uid())
);
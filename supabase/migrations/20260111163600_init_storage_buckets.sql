-- 1. CRÉATION DES BUCKETS DE STOCKAGE
-- We use ON CONFLICT to make it idempotent
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('knowledge-vault', 'knowledge-vault', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT (id) DO NOTHING;

-- 2. POLITIQUES D'ACCÈS (RLS)
-- Nettoyage pour éviter les doublons ou conflits
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth Select" ON storage.objects;
DROP POLICY IF EXISTS "Owner Delete" ON storage.objects;

-- Règle universelle pour les utilisateurs connectés
CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id IN ('project-files', 'knowledge-vault', 'company-assets', 'documents'));

CREATE POLICY "Auth Select" ON storage.objects FOR SELECT TO authenticated 
USING (bucket_id IN ('project-files', 'knowledge-vault', 'company-assets', 'documents'));

CREATE POLICY "Owner Delete" ON storage.objects FOR DELETE TO authenticated 
USING (auth.uid() = owner);

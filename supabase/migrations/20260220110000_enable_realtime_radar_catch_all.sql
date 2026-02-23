-- ============================================================
-- MIGRATION: Fix radar_catch_all for real-time live feed
-- ============================================================

-- 1. Add unique constraint required for upsert (project_id + website_url)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.radar_catch_all'::regclass
        AND conname = 'radar_catch_all_project_website_unique'
    ) THEN
        ALTER TABLE public.radar_catch_all
        ADD CONSTRAINT radar_catch_all_project_website_unique
        UNIQUE (project_id, website_url);
    END IF;
END $$;

-- 2. Add updated_at column for tracking upserts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'radar_catch_all'
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.radar_catch_all
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 3. Fix RLS: allow INSERT and UPDATE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'radar_catch_all' AND policyname = 'Allow insert for all'
    ) THEN
        CREATE POLICY "Allow insert for all" ON public.radar_catch_all
        FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'radar_catch_all' AND policyname = 'Allow update for all'
    ) THEN
        CREATE POLICY "Allow update for all" ON public.radar_catch_all
        FOR UPDATE USING (true);
    END IF;
END $$;

-- 4. Performance index
CREATE INDEX IF NOT EXISTS idx_radar_catch_all_project_created
ON public.radar_catch_all (project_id, created_at DESC);

-- 5. ENABLE REALTIME — the missing piece
ALTER PUBLICATION supabase_realtime ADD TABLE public.radar_catch_all;

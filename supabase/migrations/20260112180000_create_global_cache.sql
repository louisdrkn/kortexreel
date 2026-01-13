-- Create Global URL Cache table
-- This table is project-agnostic and serves as a long-term memory for the entire instance.

CREATE TABLE IF NOT EXISTS public.global_url_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url_domain TEXT NOT NULL UNIQUE, -- Normalized URL (no https://, no www, no trailing slash)
    scraped_data JSONB NOT NULL, -- Full Firecrawl result (markdown, metadata, etc)
    last_scanned_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.global_url_cache ENABLE ROW LEVEL SECURITY;

-- Policies
-- Any authenticated user can READ from the cache (shared knowledge)
CREATE POLICY "Enable read access for authenticated users" ON public.global_url_cache
    FOR SELECT
    TO authenticated
    USING (true);

-- Any authenticated user can INSERT into the cache (contributing to memory)
CREATE POLICY "Enable insert access for authenticated users" ON public.global_url_cache
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create index on url_domain for fast lookups
CREATE INDEX IF NOT EXISTS idx_global_url_cache_domain ON public.global_url_cache(url_domain);

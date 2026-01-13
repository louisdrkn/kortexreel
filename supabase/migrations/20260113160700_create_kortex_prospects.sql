-- Migration: Create kortex_prospects table for caching discovered prospects
-- This table stores validated prospects to avoid redundant scraping operations
-- First-time searches take ~30s, subsequent identical searches return in ~0.5s

-- Table for storing validated prospects
CREATE TABLE IF NOT EXISTS kortex_prospects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  query_signature TEXT NOT NULL,
  company_name TEXT,
  website_url TEXT,
  match_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for instant lookups by query signature
CREATE INDEX IF NOT EXISTS idx_prospects_query ON kortex_prospects(query_signature);

-- Index for filtering by project
CREATE INDEX IF NOT EXISTS idx_prospects_project ON kortex_prospects(project_id);

-- Composite index for the most common query pattern
CREATE INDEX IF NOT EXISTS idx_prospects_project_query ON kortex_prospects(project_id, query_signature);

-- Add comment to table for documentation
COMMENT ON TABLE kortex_prospects IS 'Cache table for storing discovered prospects. Eliminates redundant scraping operations by storing AI-validated company data.';
COMMENT ON COLUMN kortex_prospects.query_signature IS 'Unique identifier for the search, based on projectId for cache key';
COMMENT ON COLUMN kortex_prospects.match_data IS 'Complete JSON result from AI analysis including score, reason, signals, etc.';

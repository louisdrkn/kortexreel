-- KORTEX PROSPECTS CACHE TABLE
-- Cette table stocke les résultats de prospection pour éviter les rescans inutiles

CREATE TABLE IF NOT EXISTS kortex_prospects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query_signature TEXT NOT NULL,
  company_name TEXT,
  website_url TEXT,
  match_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospects_query ON kortex_prospects(query_signature);

-- Row Level Security
ALTER TABLE kortex_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON kortex_prospects 
  FOR SELECT 
  USING (true);

CREATE POLICY "Public insert access" ON kortex_prospects 
  FOR INSERT 
  WITH CHECK (true);

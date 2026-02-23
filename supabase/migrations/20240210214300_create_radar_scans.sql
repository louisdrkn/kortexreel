-- Create radar_scans table
CREATE TABLE IF NOT EXISTS public.radar_scans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.project_data(project_id) ON DELETE CASCADE,
    firecrawl_job_id TEXT,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    stage TEXT DEFAULT 'starting',
    progress INTEGER DEFAULT 0,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.radar_scans ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.radar_scans FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.radar_scans FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.radar_scans FOR UPDATE USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.radar_scans;

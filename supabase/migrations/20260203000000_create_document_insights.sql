-- Migration: Create Document Insights Table (Deep Memory)
-- Description: Stores structured intelligence extracted from documents (Prospects, Pain Points, Success Metrics)

create table if not exists public.document_insights (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  document_id uuid references public.company_documents(id) on delete cascade not null,
  
  -- The "Gold Nuggets" extracted from the document
  extracted_prospects jsonb default '[]'::jsonb,      -- List of companies cited as clients/partners
  specific_pain_points jsonb default '[]'::jsonb,     -- Precise technical problems mentioned
  success_metrics jsonb default '[]'::jsonb,          -- Key figures (ROI, savings, etc.)
  
  -- Metadata
  analysis_version text default 'gemini-2.0-flash',   -- Model used for extraction
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Unique constraint: One insight record per document (can be updated)
create unique index if not exists idx_document_insights_doc_id on public.document_insights(document_id);

-- RLS Policies
alter table public.document_insights enable row level security;

create policy "Users can view insights for their projects"
  on public.document_insights for select
  using (
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  );

create policy "Users can insert insights for their projects"
  on public.document_insights for insert
  with check (
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  );

create policy "Users can update insights for their projects"
  on public.document_insights for update
  using (
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  );

create policy "Users can delete insights for their projects"
  on public.document_insights for delete
  using (
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  );

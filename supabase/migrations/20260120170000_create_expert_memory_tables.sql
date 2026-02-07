-- Migration: Create Expert Memory Tables (Firecrawl Logs & Website Pages)
-- Description: Adds tables for raw Firecrawl logs and vectorized website pages to enable "Expert" mode memory.

-- 1. FIRECRAWL LOGS (Raw Data Buffer)
-- Stores the raw result of every Firecrawl operation (scrape/search) for audit and re-processing.
create table if not exists public.firecrawl_logs (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  url text not null,
  operation_type text not null check (operation_type in ('scrape', 'search', 'crawl')),
  raw_html text,             -- Optional: heavy, maybe storing only if needed
  markdown text,             -- The useful part for LLMs
  screenshot_url text,       -- URL to screenshot if requested
  metadata jsonb,            -- Firecrawl metadata (status, headers, etc.)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for searching logs by URL or Project
create index if not exists idx_firecrawl_logs_project_url on public.firecrawl_logs(project_id, url);

-- RLS for firecrawl_logs
alter table public.firecrawl_logs enable row level security;

create policy "Users can view logs for their projects"
  on public.firecrawl_logs for select
  using (
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  );

create policy "Users can insert logs for their projects"
  on public.firecrawl_logs for insert
  with check (
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  );

-- 2. WEBSITE PAGES (Structured & Vectorized Site Content)
-- Stores the parsed pages of the user's OWN website for the "Expert Identity" RAG.
create table if not exists public.website_pages (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  url text not null,
  title text,
  content text,              -- Cleaned text content
  embedding vector(768),     -- Gemini text-embedding-004 (768 dimensions)
  last_crawled_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for vector search (ivfflat)
-- Note: Assuming < 2000 vectors for now. For larger datasets, HNSW is better but IVFFlat is standard in pgvector for moderate size.
-- We use vector_cosine_ops for cosine similarity.
create index if not exists website_pages_embedding_idx on public.website_pages 
using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Unique constraint to avoid duplicating pages for the same project
create unique index if not exists idx_website_pages_project_url on public.website_pages(project_id, url);

-- RLS for website_pages
alter table public.website_pages enable row level security;

create policy "Users can view website pages for their projects"
  on public.website_pages for select
  using (
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  );

create policy "Users can maintain website pages for their projects"
  on public.website_pages for all
  using (
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  )
  with check (
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  );

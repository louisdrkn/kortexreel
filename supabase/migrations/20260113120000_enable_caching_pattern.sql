create table if not exists public.cached_analyses (
  id uuid not null default gen_random_uuid(),
  domain text not null,
  full_url text not null,
  analysis_data jsonb not null,
  created_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null,
  constraint cached_analyses_pkey primary key (id)
);

create index if not exists idx_cached_analyses_domain on public.cached_analyses (domain);
create index if not exists idx_cached_analyses_url on public.cached_analyses (full_url);

alter table public.cached_analyses enable row level security;

-- Allow read access for authenticated users (or anyone if public, but better restricted)
create policy "Enable read access for authenticated users" 
on public.cached_analyses for select 
to authenticated
using (true);

-- Allow service role full access (implicit, but good to note)
-- Service role bypasses RLS.

-- Allow insert for authenticated users
create policy "Enable insert for authenticated users" 
on public.cached_analyses for insert 
to authenticated 
with check (true);

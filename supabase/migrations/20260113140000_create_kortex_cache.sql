-- Migration: Create Kortex Cache Table for Dual-Layer Memory
-- Description: Stores user memory snapshots for persistent access across devices.

create table if not exists public.kortex_cache (
  user_id uuid references auth.users not null,
  key text not null,
  value jsonb,
  updated_at timestamptz default now(),
  primary key (user_id, key)
);

-- Enable RLS
alter table public.kortex_cache enable row level security;

-- Policies
create policy "Users can view their own cache" 
on public.kortex_cache for select 
to authenticated 
using (auth.uid() = user_id);

create policy "Users can upsert their own cache" 
on public.kortex_cache for insert 
to authenticated 
with check (auth.uid() = user_id);

create policy "Users can update their own cache"
on public.kortex_cache for update
to authenticated
using (auth.uid() = user_id);

-- Optional: Realtime
alter publication supabase_realtime add table public.kortex_cache;

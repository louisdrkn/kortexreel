create table if not exists debug_quality_logs (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  prospect_name text,
  prospect_url text,
  rejection_reason text,
  match_score integer,
  analysis_log jsonb,
  attempted_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table debug_quality_logs enable row level security;

create policy "Users can view logs for their projects"
  on debug_quality_logs for select
  using (
    project_id in (
      select id from projects where user_id = auth.uid()
    )
  );

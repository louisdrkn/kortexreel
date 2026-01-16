create table if not exists strategic_identities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade unique,
  unique_value_proposition text,
  core_pain_points jsonb,      -- List of pain points identified from Deep Analysis
  symptom_profile jsonb,       -- Observable signals (keywords, technologies, job posts)
  ideal_prospect_profile text,
  exclusion_criteria text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- RLS Policies
alter table strategic_identities enable row level security;

create policy "Users can view their project's strategic identity"
  on strategic_identities for select
  using ( auth.uid() in (
    select user_id from projects where id = strategic_identities.project_id
  ));

create policy "Users can insert their project's strategic identity"
  on strategic_identities for insert
  with check ( auth.uid() in (
    select user_id from projects where id = strategic_identities.project_id
  ));

create policy "Users can update their project's strategic identity"
  on strategic_identities for update
  using ( auth.uid() in (
    select user_id from projects where id = strategic_identities.project_id
  ));

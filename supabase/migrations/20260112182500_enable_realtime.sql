
-- Enable Realtime for critical tables
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table company_analyses;
alter publication supabase_realtime add table project_data;

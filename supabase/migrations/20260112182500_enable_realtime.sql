-- Enable Realtime for critical tables (idempotent)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE projects;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE company_analyses;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE project_data;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;

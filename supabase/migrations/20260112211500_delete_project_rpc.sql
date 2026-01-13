-- Function to delete a project and all its dependencies
-- This creates a 'CASCADE' like effect manually to ensure clean deletion despite complex relationships

CREATE OR REPLACE FUNCTION delete_project_fully(target_project_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Delete Lead Interactions (depends on Project & Company)
    DELETE FROM public.lead_interactions
    WHERE project_id = target_project_id;

    -- 2. Delete Tasks (may depend on Leads linked to project, or duplicate logic if leads are deleted)
    -- Tasks that are linked to Leads of this project need to go first if we enforce FK strictly
    DELETE FROM public.tasks
    WHERE lead_id IN (SELECT id FROM public.leads WHERE project_id = target_project_id)
       OR mission_id IN (SELECT id FROM public.missions WHERE id IN (
            -- If missions are project specific? Schema says missions link to org_id, not project_id directly,
            -- but let's check if we missed a direct project link. The schema showed missions linked to org.
            -- Re-reading schema: Missions table does NOT have project_id.
            -- But Leads DO have project_id. So cleaning tasks linked to leads is correct.
            SELECT id FROM public.leads WHERE project_id = target_project_id -- Just in case tasks refer to these leads
       ));

    -- 3. Delete Leads
    DELETE FROM public.leads
    WHERE project_id = target_project_id;

    -- 4. Delete Company Analyses
    -- Note: This might trigger cascade for lead_interactions if setup, but we did it manually above to be safe
    DELETE FROM public.company_analyses
    WHERE project_id = target_project_id;

    -- 5. Delete Project Data (generic data store)
    DELETE FROM public.project_data
    WHERE project_id = target_project_id;

    -- 6. Delete Learned Preferences
    DELETE FROM public.learned_preferences
    WHERE project_id = target_project_id;

    -- 7. Delete Research Jobs
    DELETE FROM public.research_jobs
    WHERE project_id = target_project_id;

    -- 8. Delete Company Documents (Metadata only, file storage cleanup is separate usually)
    DELETE FROM public.company_documents
    WHERE project_id = target_project_id;
    
    -- 9. Delete the Project itself
    DELETE FROM public.projects
    WHERE id = target_project_id;

END;
$$;

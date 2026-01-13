-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "http";

-- Create Enums
DO $$ BEGIN
    CREATE TYPE "public"."agent_archetype" AS ENUM ('researcher', 'writer', 'analyst', 'strategist');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."agent_status" AS ENUM ('idle', 'busy', 'offline');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."org_role" AS ENUM ('owner', 'admin', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."pipeline_stage" AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'closed', 'lost');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."subscription_tier" AS ENUM ('free', 'pro', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."task_status" AS ENUM ('pending', 'in_progress', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."task_type" AS ENUM ('research', 'outreach', 'analysis');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Tables

-- Organizations
CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "name" text NOT NULL,
    "credits_balance" integer DEFAULT 0 NOT NULL,
    "subscription_tier" "public"."subscription_tier" DEFAULT 'free'::"public"."subscription_tier" NOT NULL,
    "resources_limit" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "api_settings" jsonb,
    "brand_identity" jsonb,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- Profiles
CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" uuid NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "full_name" text,
    "avatar_url" text,
    "org_id" uuid,
    "onboarding_completed" boolean DEFAULT false NOT NULL,
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "profiles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id")
);

-- Projects
CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "name" text NOT NULL,
    "user_id" uuid,
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- Project Data
CREATE TABLE IF NOT EXISTS "public"."project_data" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "project_id" uuid NOT NULL,
    "user_id" uuid,
    "data_type" text NOT NULL,
    "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT "project_data_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "project_data_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
);

-- Company Analyses
CREATE TABLE IF NOT EXISTS "public"."company_analyses" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "project_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "company_name" text NOT NULL,
    "company_url" text,
    "industry" text,
    "location" text,
    "headcount" text,
    "description_long" text,
    "match_score" double precision,
    "match_explanation" text,
    "strategic_analysis" text,
    "custom_hook" text,
    "logo_url" text,
    "analysis_status" text,
    "analyzed_at" timestamp with time zone,
    "detected_pain_points" jsonb,
    "buying_signals" jsonb,
    "key_urls" jsonb,
    CONSTRAINT "company_analyses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "company_analyses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id"),
    CONSTRAINT "company_analyses_project_url_unique" UNIQUE ("project_id", "company_url")
);

-- Company Documents
CREATE TABLE IF NOT EXISTS "public"."company_documents" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "project_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "file_name" text NOT NULL,
    "file_url" text NOT NULL,
    "file_type" text NOT NULL,
    "file_size" integer,
    "extraction_status" text,
    "extracted_content" text,
    CONSTRAINT "company_documents_pkey" PRIMARY KEY ("id")
);

-- Knowledge Base
CREATE TABLE IF NOT EXISTS "public"."knowledge_base" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "org_id" uuid NOT NULL,
    "file_name" text NOT NULL,
    "file_url" text NOT NULL,
    "doc_type" text NOT NULL,
    "processing_status" text NOT NULL,
    "summary" text,
    "extracted_data" jsonb,
    CONSTRAINT "knowledge_base_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "knowledge_base_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id")
);

-- Knowledge Chunks (with Vector Embedding)
CREATE TABLE IF NOT EXISTS "public"."knowledge_chunks" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "knowledge_id" uuid NOT NULL,
    "content" text NOT NULL,
    "embedding" vector(1536), -- Assuming OpenAI/Gemini embedding size
    "metadata" jsonb,
    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "knowledge_chunks_knowledge_id_fkey" FOREIGN KEY ("knowledge_id") REFERENCES "public"."knowledge_base"("id")
);

-- Lead Interactions
CREATE TABLE IF NOT EXISTS "public"."lead_interactions" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "user_id" uuid NOT NULL,
    "project_id" uuid NOT NULL,
    "company_id" uuid NOT NULL,
    "action" text NOT NULL,
    "duration_ms" integer,
    "metadata" jsonb,
    CONSTRAINT "lead_interactions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lead_interactions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id"),
    CONSTRAINT "lead_interactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company_analyses"("id")
);

-- Leads
CREATE TABLE IF NOT EXISTS "public"."leads" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "org_id" uuid NOT NULL,
    "project_id" uuid,
    "assigned_agent_id" uuid,
    "company_name" text,
    "pipeline_stage" "public"."pipeline_stage" NOT NULL,
    "qualification_score" double precision,
    "contact_info" jsonb,
    "linkedin_data" jsonb,
    "notes" text,
    CONSTRAINT "leads_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "leads_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id"),
    CONSTRAINT "leads_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
);

-- Learned Preferences
CREATE TABLE IF NOT EXISTS "public"."learned_preferences" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "project_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "sector_weights" jsonb,
    "size_weights" jsonb,
    "technology_weights" jsonb,
    "keyword_boosts" jsonb,
    "excluded_patterns" jsonb,
    "pain_point_analysis" jsonb,
    "last_calibrated_at" timestamp with time zone,
    CONSTRAINT "learned_preferences_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "learned_preferences_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id"),
    CONSTRAINT "learned_preferences_project_id_unique" UNIQUE ("project_id")
);

-- Missions
CREATE TABLE IF NOT EXISTS "public"."missions" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "org_id" uuid NOT NULL,
    "name" text NOT NULL,
    "status" text NOT NULL,
    "target_criteria" jsonb,
    "strategy_prompt" text,
    "stats" jsonb,
    CONSTRAINT "missions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "missions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id")
);

-- Research Jobs
CREATE TABLE IF NOT EXISTS "public"."research_jobs" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "project_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "status" text NOT NULL,
    "progress" integer NOT NULL,
    "current_step" text,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "error_message" text,
    "results" jsonb,
    "step_details" jsonb,
    CONSTRAINT "research_jobs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "research_jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
);

-- System Secrets
CREATE TABLE IF NOT EXISTS "public"."system_secrets" (
    "secret_name" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "secret_value" text NOT NULL,
    "description" text,
    CONSTRAINT "system_secrets_pkey" PRIMARY KEY ("secret_name")
);

-- Tasks
CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "org_id" uuid NOT NULL,
    "mission_id" uuid,
    "lead_id" uuid,
    "agent_id" uuid,
    "type" "public"."task_type" NOT NULL,
    "status" "public"."task_status" NOT NULL,
    "payload" jsonb,
    "result" jsonb,
    "scheduled_at" timestamp with time zone,
    "executed_at" timestamp with time zone,
    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tasks_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id"),
    CONSTRAINT "tasks_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id"),
    CONSTRAINT "tasks_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id")
);

-- User Roles
CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "user_id" uuid NOT NULL,
    "org_id" uuid NOT NULL,
    "role" "public"."org_role" NOT NULL,
    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_roles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id")
);

-- Virtual Agents
CREATE TABLE IF NOT EXISTS "public"."virtual_agents" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "org_id" uuid NOT NULL,
    "name" text NOT NULL,
    "archetype" "public"."agent_archetype" NOT NULL,
    "status" "public"."agent_status" NOT NULL,
    "personality_prompt" text,
    "memory" jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT "virtual_agents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "virtual_agents_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id")
);

-- Add foreign key for leads agent_id (can only be done after virtual_agents exists)
ALTER TABLE "public"."leads" ADD CONSTRAINT "leads_assigned_agent_id_fkey" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."virtual_agents"("id");

-- Add foreign key for tasks agent_id
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."virtual_agents"("id");

-- RLS Policies

-- Enable RLS on all tables
ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."project_data" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."company_analyses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."company_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."knowledge_base" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."knowledge_chunks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."lead_interactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."learned_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."missions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."research_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."system_secrets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."virtual_agents" ENABLE ROW LEVEL SECURITY;

-- Allow All Service Role (Backend Access)
DO $$ BEGIN
    CREATE POLICY "Allow All Service Role" ON "public"."organizations" USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Service Role" ON "public"."profiles" USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Service Role" ON "public"."projects" USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Service Role" ON "public"."project_data" USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Service Role" ON "public"."company_analyses" USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Service Role" ON "public"."company_documents" USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Service Role" ON "public"."knowledge_base" USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Service Role" ON "public"."knowledge_chunks" USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Service Role" ON "public"."lead_interactions" USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Service Role" ON "public"."leads" USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Service Role" ON "public"."learned_preferences" USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Service Role" ON "public"."missions" USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Service Role" ON "public"."research_jobs" USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Service Role" ON "public"."system_secrets" USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Service Role" ON "public"."tasks" USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Service Role" ON "public"."user_roles" USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Service Role" ON "public"."virtual_agents" USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Allow All Authenticated (Frontend Access - Temporary)
DO $$ BEGIN
    CREATE POLICY "Allow All Authenticated" ON "public"."organizations" FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Authenticated" ON "public"."profiles" FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Authenticated" ON "public"."projects" FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Authenticated" ON "public"."project_data" FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Authenticated" ON "public"."company_analyses" FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Authenticated" ON "public"."company_documents" FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Authenticated" ON "public"."knowledge_base" FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Authenticated" ON "public"."knowledge_chunks" FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Authenticated" ON "public"."lead_interactions" FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Authenticated" ON "public"."leads" FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Authenticated" ON "public"."learned_preferences" FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Authenticated" ON "public"."missions" FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Authenticated" ON "public"."research_jobs" FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Authenticated" ON "public"."system_secrets" FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Authenticated" ON "public"."tasks" FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Authenticated" ON "public"."user_roles" FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow All Authenticated" ON "public"."virtual_agents" FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Create Storage Buckets
-- Note: Buckets are usually created via API or UI, but we can try inserting if storage schema is accessible from SQL
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT DO NOTHING;

-- Storage Policies
DO $$ BEGIN
    CREATE POLICY "Access company-assets" ON storage.objects FOR SELECT TO public USING (bucket_id = 'company-assets');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Upload company-assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-assets');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Access documents" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');
EXCEPTION WHEN duplicate_object THEN null; END $$;

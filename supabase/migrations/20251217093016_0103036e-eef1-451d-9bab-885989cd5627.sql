-- Add api_settings column to organizations for storing API keys
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS api_settings JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.api_settings IS 'Stores API keys and connection settings for external services (encrypted at rest)';
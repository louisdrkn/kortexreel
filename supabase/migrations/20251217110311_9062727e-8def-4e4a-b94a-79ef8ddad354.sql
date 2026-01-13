-- Create the system secrets vault table
CREATE TABLE IF NOT EXISTS public.system_secrets (
  secret_name TEXT PRIMARY KEY,
  secret_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_secrets ENABLE ROW LEVEL SECURITY;

-- DENY ALL policy for authenticated users (they cannot read/write)
CREATE POLICY "deny_all_authenticated" ON public.system_secrets
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- DENY ALL policy for anonymous users
CREATE POLICY "deny_all_anon" ON public.system_secrets
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Add trigger for updated_at
CREATE TRIGGER update_system_secrets_updated_at
  BEFORE UPDATE ON public.system_secrets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.system_secrets IS 'Secure vault for system API keys. Only accessible via service_role (Edge Functions).';
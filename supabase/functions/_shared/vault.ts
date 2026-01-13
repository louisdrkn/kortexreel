import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Fetch secret from system_secrets vault using service_role
export async function getVaultSecret(secretName: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[VAULT] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return null;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const { data, error } = await supabase
    .from('system_secrets')
    .select('secret_value')
    .eq('secret_name', secretName)
    .single();

  if (error) {
    console.error(`[VAULT] Error fetching ${secretName}:`, error.message);
    return null;
  }

  return data?.secret_value || null;
}

// Fetch multiple secrets at once
export async function getVaultSecrets(secretNames: string[]): Promise<Record<string, string | null>> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[VAULT] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return Object.fromEntries(secretNames.map(name => [name, null]));
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const { data, error } = await supabase
    .from('system_secrets')
    .select('secret_name, secret_value')
    .in('secret_name', secretNames);

  if (error) {
    console.error('[VAULT] Error fetching secrets:', error.message);
    return Object.fromEntries(secretNames.map(name => [name, null]));
  }

  const result: Record<string, string | null> = {};
  for (const name of secretNames) {
    const found = data?.find(d => d.secret_name === name);
    result[name] = found?.secret_value || null;
  }

  return result;
}

// Check if a required secret exists, throw descriptive error if missing
export function requireSecret(secretName: string, value: string | null): string {
  if (!value) {
    throw new Error(`CRITICAL: SYSTEM KEY [${secretName}] NOT FOUND IN VAULT`);
  }
  return value;
}

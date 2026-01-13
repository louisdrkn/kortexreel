import { createClient as createSupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export function createClient(req?: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY",
    );
  }

  // If request is provided, we could extract auth headers to create a user-scoped client.
  // For now, we default to Service Role for backend ops, or just standard client.
  // In Supabase Edge Functions, it's common to pass the Authorization header from the invoking client.

  const options: any = {
    auth: {
      persistSession: false,
    },
  };

  if (req) {
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      options.global = {
        headers: { Authorization: authHeader },
      };
    }
  }

  return createSupabaseClient(supabaseUrl, supabaseKey, options);
}

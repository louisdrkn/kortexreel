/// <reference lib="deno.ns" />
/// <reference lib="deno.unstable" />

/**
 * Deno global types for Supabase Edge Functions.
 * Since we reference deno.ns, standard Deno APIs are already available.
 * We only need to declare Supabase-specific extensions if any.
 */

// EdgeRuntime global for background tasks in Supabase
declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

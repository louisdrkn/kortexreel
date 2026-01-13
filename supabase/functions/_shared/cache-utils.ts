import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface CacheEntry {
  domain: string;
  full_url: string;
  analysis_data: any;
  expires_at: string;
}

// Normalize URL to get clean domain (e.g. "www.example.com/foo" -> "example.com")
export function normalizeDomain(url: string): string {
  try {
    let clean = url.trim().toLowerCase();
    if (!clean.startsWith("http")) clean = "https://" + clean;
    const urlObj = new URL(clean);
    let domain = urlObj.hostname;
    if (domain.startsWith("www.")) domain = domain.slice(4);
    return domain;
  } catch (e) {
    return url; // Return original if parsing fails
  }
}

/**
 * Checks the cache for a valid, non-expired analysis.
 * Returns the cached data if found, or null if not found/expired.
 */
export async function checkCache(
  supabase: SupabaseClient,
  domainOrUrl: string,
): Promise<any | null> {
  const domain = normalizeDomain(domainOrUrl);

  // Also check full_url exact match if needed, but domain is usually safer for "company logic"
  // We check for valid expiry date
  const { data, error } = await supabase
    .from("cached_analyses")
    .select("analysis_data")
    .eq("domain", domain)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  console.log(`[CACHE] HIT for ${domain}`);
  return data.analysis_data;
}

/**
 * Saves a result to the cache.
 * Default expiration is 7 days.
 */
export async function saveCache(
  supabase: SupabaseClient,
  fullUrl: string,
  data: any,
  daysToLive = 7,
): Promise<void> {
  const domain = normalizeDomain(fullUrl);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + daysToLive);

  const entry = {
    domain,
    full_url: fullUrl,
    analysis_data: data,
    expires_at: expiresAt.toISOString(),
  };

  const { error } = await supabase.from("cached_analyses").insert(entry);

  if (error) {
    console.error(`[CACHE] Failed to save for ${domain}:`, error);
  } else {
    console.log(`[CACHE] Saved for ${domain}`);
  }
}

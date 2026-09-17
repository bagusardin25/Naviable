import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Admin client — backend-only, bypasses RLS.
 * The service_role key lives ONLY here, never in the frontend.
 */
let cached: SupabaseClient | null = null;

export function adminSupabase(): SupabaseClient {
  if (!cached) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    }
    cached = createClient(url, key, { auth: { persistSession: false } });
  }
  return cached;
}

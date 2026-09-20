import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client (anon key — safe to expose; RLS protects data).
 * Used for Supabase Auth (email/password and Google OAuth) from the frontend.
 *
 * Data reads/writes go through the Express backend (NEXT_PUBLIC_API_URL),
 * which holds the service_role key server-side. Never put the service_role
 * key or Gemini key in the frontend.
 */
let cached: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient {
  if (!cached) {
    cached = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return cached;
}

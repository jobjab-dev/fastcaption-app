import { createClient } from "@supabase/supabase-js";

/**
 * Admin Supabase client using service_role key.
 * Bypasses RLS — use ONLY in server-side code (API routes).
 * 
 * This is used for storage operations (upload/download) where
 * the internal user ID doesn't match Supabase auth.uid().
 */
export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key || url.includes("your-project")) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

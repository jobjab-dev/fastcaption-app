"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/app/lib/supabase/client";

/**
 * Client-side auth callback handler.
 * Supabase magic link redirects here with hash fragments (#access_token=...)
 * that are invisible to server-side route handlers.
 * This page processes the hash on the client and redirects to dashboard.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    // The Supabase client automatically detects hash fragments
    // and exchanges them for a session.
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          // Sync user to DB
          try {
            await fetch("/api/auth/sync", { method: "POST" });
          } catch (e) {
            console.error("[auth/callback] DB sync error:", e);
          }
          router.replace("/dashboard");
        }
      }
    );

    // Also check if already signed in (e.g. session from URL hash was auto-processed)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          await fetch("/api/auth/sync", { method: "POST" });
        } catch (e) {
          console.error("[auth/callback] DB sync error:", e);
        }
        router.replace("/dashboard");
      }
    };

    // Give Supabase a moment to process the hash fragment
    setTimeout(checkSession, 1000);

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, supabase.auth]);

  return (
    <div
      className="page"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 60px)",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <span className="spinner spinner-lg" />
      <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
        Signing you in...
      </p>
    </div>
  );
}

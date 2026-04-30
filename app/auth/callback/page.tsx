"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/app/lib/supabase/client";
import { Suspense } from "react";

/**
 * Client-side auth callback handler.
 * Handles both:
 * 1. PKCE flow: ?code=xxx (magic link & OAuth)
 * 2. Implicit flow: #access_token=xxx (fallback)
 */
function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");

      if (code) {
        // ── PKCE flow: exchange the code for a session ──
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("[auth/callback] Code exchange error:", error.message);
          router.replace("/login?error=exchange_failed");
          return;
        }
      }

      // Check if session exists (either from code exchange or hash fragment)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Sync user to DB
        try {
          await fetch("/api/auth/sync", { method: "POST" });
        } catch (e) {
          console.error("[auth/callback] DB sync error:", e);
        }
        router.replace("/dashboard");
        return;
      }

      // No code and no session — listen for auth state change (hash fragment)
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === "SIGNED_IN" && session) {
            try {
              await fetch("/api/auth/sync", { method: "POST" });
            } catch (e) {
              console.error("[auth/callback] DB sync error:", e);
            }
            router.replace("/dashboard");
          }
        }
      );

      // Timeout: if nothing happens in 10 seconds, redirect to login
      const timeout = setTimeout(() => {
        console.error("[auth/callback] Timeout — no session established");
        router.replace("/login?error=timeout");
      }, 10000);

      return () => {
        authListener.subscription.unsubscribe();
        clearTimeout(timeout);
      };
    };

    handleCallback();
  }, [router, searchParams, supabase.auth]);

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

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          className="page"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "calc(100vh - 60px)",
          }}
        >
          <span className="spinner spinner-lg" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}

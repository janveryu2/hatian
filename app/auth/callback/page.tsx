"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * OAuth callback handler.
 * Supabase redirects here after Google sign-in with a code in the URL hash.
 * We exchange it for a session, then redirect to the app.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseClient();

    // The hash fragment contains the auth code/tokens
    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.replace("/home");
      }
    });

    // Also handle the case where session is already set
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/home");
      }
    });
  }, [router]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg-primary">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-accent-teal border-t-transparent rounded-full animate-spin" />
        <p className="text-body text-text-secondary">Signing you in…</p>
      </div>
    </div>
  );
}

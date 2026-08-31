"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

/**
 * OAuth callback handler.
 * Supabase redirects here after Google sign-in with a code or hash tokens.
 * We exchange it for a session, then redirect to /home.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Attempt closing in-app browser if returning to WebView
    if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
      Browser.close().catch(() => {});
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      router.replace("/login");
      return;
    }

    let isHandled = false;

    async function handleAuth() {
      try {
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          const errorParam = url.searchParams.get("error") || url.searchParams.get("error_description");
          if (errorParam) {
            setErrorMsg(errorParam);
            setTimeout(() => router.replace("/login"), 3000);
            return;
          }

          const code = url.searchParams.get("code");
          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              console.error("Code exchange error:", exchangeError);
            } else {
              isHandled = true;
              router.replace("/home");
              return;
            }
          }
        }

        // Check if session already exists or is emitted via auth state change
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          isHandled = true;
          router.replace("/home");
          return;
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
            isHandled = true;
            router.replace("/home");
          }
        });

        // 5-second fallback: if not signed in, redirect to login
        const timer = setTimeout(() => {
          if (!isHandled) {
            subscription.unsubscribe();
            router.replace("/login");
          }
        }, 5000);

        return () => {
          clearTimeout(timer);
          subscription.unsubscribe();
        };
      } catch (err) {
        console.error("Callback error:", err);
        router.replace("/login");
      }
    }

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg-primary">
      <div className="flex flex-col items-center gap-4 text-center px-4">
        {errorMsg ? (
          <>
            <div className="text-3xl">⚠️</div>
            <p className="text-body font-medium text-accent-terracotta">{errorMsg}</p>
            <p className="text-caption text-text-tertiary">Redirecting to login…</p>
          </>
        ) : (
          <>
            <div className="w-8 h-8 border-2 border-accent-teal border-t-transparent rounded-full animate-spin" />
            <p className="text-body text-text-secondary">Signing you in…</p>
          </>
        )}
      </div>
    </div>
  );
}

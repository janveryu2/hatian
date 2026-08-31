"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";
import type { User, Session } from "@supabase/supabase-js";

import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabaseRef = useRef<ReturnType<typeof getSupabaseClient> | null>(null);
  const getClient = useCallback(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = getSupabaseClient();
    }
    return supabaseRef.current;
  }, []);

  const fetchProfile = useCallback(
    async (currentUser: User): Promise<Profile | null> => {
      const supabase = getClient();
      if (!supabase) return null;

      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (data) return data;

        const meta = currentUser.user_metadata;
        const displayName =
          meta?.full_name ||
          meta?.name ||
          currentUser.email?.split("@")[0] ||
          "Roommate";
        const avatarUrl = meta?.avatar_url || meta?.picture || null;

        const { data: createdProfile } = await supabase
          .from("profiles")
          .upsert({
            id: currentUser.id,
            display_name: displayName,
            avatar_url: avatarUrl,
            email: currentUser.email || null,
          })
          .select()
          .maybeSingle();

        return createdProfile || {
          id: currentUser.id,
          display_name: displayName,
          avatar_url: avatarUrl,
          email: currentUser.email || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      } catch (err) {
        console.error("fetchProfile error:", err);
        return null;
      }
    },
    [getClient]
  );

  useEffect(() => {
    const supabase = getClient();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session: initSession } }) => {
      if (!isMounted) return;
      if (initSession?.user) {
        setSession(initSession);
        setUser(initSession.user);
        const prof = await fetchProfile(initSession.user);
        if (isMounted) setProfile(prof);
      }
      if (isMounted) setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      if (newSession?.user) {
        setSession(newSession);
        setUser(newSession.user);
        const prof = await fetchProfile(newSession.user);
        if (isMounted) setProfile(prof);
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
      if (isMounted) setIsLoading(false);
    });

    // Native App URL Listener for OAuth deep link returns
    let appUrlSub: Promise<{ remove: () => void }> | null = null;
    if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
      appUrlSub = App.addListener("appUrlOpen", async (event) => {
        try {
          await Browser.close();
        } catch {
          // Browser already closed
        }

        if (event.url.includes("code=")) {
          try {
            const urlObj = new URL(event.url);
            const code = urlObj.searchParams.get("code");
            if (code) {
              await supabase.auth.exchangeCodeForSession(code);
            }
          } catch (e) {
            console.error("Deep link parsing error:", e);
          }
        }
      });
    }

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (appUrlSub) {
        appUrlSub.then((h) => h.remove());
      }
    };
  }, [getClient, fetchProfile]);

  const signInWithGoogle = useCallback(async () => {
    const supabase = getClient();
    if (!supabase) return;

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : "https://hatian-sage.vercel.app/auth/callback";

    if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (data?.url) {
        await Browser.open({ url: data.url, windowName: "_self" });
      }
    } else {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });
      if (error) throw error;
    }
  }, [getClient]);

  const signOut = useCallback(async () => {
    const supabase = getClient();
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
    setSession(null);
  }, [getClient]);

  const value = useMemo(
    () => ({
      user,
      profile,
      session,
      isLoading,
      signInWithGoogle,
      signOut,
    }),
    [user, profile, session, isLoading, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

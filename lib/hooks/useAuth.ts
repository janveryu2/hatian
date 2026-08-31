"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    isLoading: true,
  });

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
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (data) return data;

        // Auto-create/upsert profile if missing
        const meta = currentUser.user_metadata;
        const displayName =
          meta?.full_name ||
          meta?.name ||
          currentUser.email?.split("@")[0] ||
          "Roommate";
        const avatarUrl = meta?.avatar_url || meta?.picture || null;

        const { data: createdProfile, error: upsertErr } = await supabase
          .from("profiles")
          .upsert({
            id: currentUser.id,
            display_name: displayName,
            avatar_url: avatarUrl,
            email: currentUser.email || null,
          })
          .select()
          .maybeSingle();

        if (upsertErr) {
          console.warn("Could not upsert profile:", upsertErr);
        }

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
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user);
        setState({
          user: session.user,
          profile,
          session,
          isLoading: false,
        });
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user);
        setState({
          user: session.user,
          profile,
          session,
          isLoading: false,
        });
      } else {
        setState({
          user: null,
          profile: null,
          session: null,
          isLoading: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [getClient, fetchProfile]);

  const signInWithGoogle = useCallback(async () => {
    const supabase = getClient();
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  }, [getClient]);

  const signOut = useCallback(async () => {
    const supabase = getClient();
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, [getClient]);

  return {
    ...state,
    signInWithGoogle,
    signOut,
  };
}

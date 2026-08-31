"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";
import type {
  Dorm,
  DormMember,
  DormInvite,
  Profile,
} from "@/lib/supabase/types";
import {
  generateInviteCode,
  normalizeInviteCode,
  getInviteExpirationDate,
  isInviteExpired,
} from "@/lib/utils/invite";

export interface DormMemberWithProfile extends DormMember {
  profile: Profile | null;
}

export interface DormState {
  dorms: Dorm[];
  activeDorm: Dorm | null;
  members: DormMemberWithProfile[];
  activeInvites: DormInvite[];
  userMembership: DormMember | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

const ACTIVE_DORM_STORAGE_KEY = "hatian_active_dorm_id";

export function useDorm() {
  const { user } = useAuth();
  const [state, setState] = useState<DormState>({
    dorms: [],
    activeDorm: null,
    members: [],
    activeInvites: [],
    userMembership: null,
    isAdmin: false,
    isLoading: true,
    error: null,
  });

  const supabaseRef = useRef<ReturnType<typeof getSupabaseClient> | null>(null);
  const getClient = useCallback(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = getSupabaseClient();
    }
    return supabaseRef.current;
  }, []);

  // Fetch all members & their profiles for a specific dorm
  const fetchDormMembers = useCallback(
    async (dormId: string): Promise<DormMemberWithProfile[]> => {
      const supabase = getClient();
      if (!supabase) return [];

      const { data: members, error: membersError } = await supabase
        .from("dorm_members")
        .select("*")
        .eq("dorm_id", dormId)
        .order("created_at", { ascending: true });

      if (membersError || !members) {
        console.error("Error fetching dorm members:", membersError);
        return [];
      }

      // Fetch profiles for all members
      const userIds = members.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      const profileMap = new Map<string, Profile>();
      if (profiles) {
        profiles.forEach((p) => profileMap.set(p.id, p));
      }

      return members.map((m) => ({
        ...m,
        profile: profileMap.get(m.user_id) || null,
      }));
    },
    [getClient]
  );

  // Fetch invites for the dorm
  const fetchDormInvites = useCallback(
    async (dormId: string): Promise<DormInvite[]> => {
      const supabase = getClient();
      if (!supabase) return [];

      const { data: invites, error } = await supabase
        .from("dorm_invites")
        .select("*")
        .eq("dorm_id", dormId)
        .order("created_at", { ascending: false });

      if (error || !invites) return [];
      return invites;
    },
    [getClient]
  );

  // Load all user's dorms and the active dorm's full data
  const loadDormData = useCallback(
    async (preferredDormId?: string) => {
      const supabase = getClient();
      if (!supabase || !user) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // 1. Get all memberships for the current user
        const { data: memberships, error: memError } = await supabase
          .from("dorm_members")
          .select("dorm_id")
          .eq("user_id", user.id);

        if (memError) throw memError;

        if (!memberships || memberships.length === 0) {
          setState({
            dorms: [],
            activeDorm: null,
            members: [],
            activeInvites: [],
            userMembership: null,
            isAdmin: false,
            isLoading: false,
            error: null,
          });
          return;
        }

        const dormIds = memberships.map((m) => m.dorm_id);

        // 2. Fetch the corresponding dorm records
        const { data: dorms, error: dormError } = await supabase
          .from("dorms")
          .select("*")
          .in("id", dormIds)
          .order("created_at", { ascending: false });

        if (dormError) throw dormError;
        if (!dorms || dorms.length === 0) {
          setState({
            dorms: [],
            activeDorm: null,
            members: [],
            activeInvites: [],
            userMembership: null,
            isAdmin: false,
            isLoading: false,
            error: null,
          });
          return;
        }

        // 3. Determine active dorm
        const savedDormId =
          preferredDormId ||
          (typeof window !== "undefined"
            ? localStorage.getItem(ACTIVE_DORM_STORAGE_KEY)
            : null);

        const activeDorm =
          dorms.find((d) => d.id === savedDormId) || dorms[0];

        if (typeof window !== "undefined" && activeDorm) {
          localStorage.setItem(ACTIVE_DORM_STORAGE_KEY, activeDorm.id);
        }

        // 4. Fetch members and invites for active dorm
        const [members, invites] = await Promise.all([
          fetchDormMembers(activeDorm.id),
          fetchDormInvites(activeDorm.id),
        ]);

        const userMembership =
          members.find((m) => m.user_id === user.id) || null;

        setState({
          dorms,
          activeDorm,
          members,
          activeInvites: invites,
          userMembership,
          isAdmin: userMembership?.role === "admin",
          isLoading: false,
          error: null,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load dorms";
        console.error("useDorm error:", err);
        setState((prev) => ({ ...prev, isLoading: false, error: message }));
      }
    },
    [getClient, user, fetchDormMembers, fetchDormInvites]
  );

  // Initial load
  useEffect(() => {
    loadDormData();
  }, [loadDormData]);

  // Realtime subscription for dorm members and invites
  useEffect(() => {
    const supabase = getClient();
    if (!supabase || !state.activeDorm) return;

    const dormId = state.activeDorm.id;

    const channel = supabase
      .channel(`dorm_realtime_${dormId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dorm_members",
          filter: `dorm_id=eq.${dormId}`,
        },
        () => {
          loadDormData(dormId);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dorm_invites",
          filter: `dorm_id=eq.${dormId}`,
        },
        () => {
          fetchDormInvites(dormId).then((activeInvites) => {
            setState((prev) => ({ ...prev, activeInvites }));
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [getClient, state.activeDorm, loadDormData, fetchDormInvites]);

  // Switch active dorm
  const switchActiveDorm = useCallback(
    (dormId: string) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(ACTIVE_DORM_STORAGE_KEY, dormId);
      }
      loadDormData(dormId);
    },
    [loadDormData]
  );

  // Create a new dorm
  const createDorm = useCallback(
    async (name: string, moveInDate?: string): Promise<Dorm> => {
      const supabase = getClient();
      if (!supabase || !user) throw new Error("User not authenticated");

      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("Dorm name cannot be empty");

      // 1. Insert Dorm
      const { data: newDorm, error: dormError } = await supabase
        .from("dorms")
        .insert({
          name: trimmedName,
          currency: "PHP",
          created_by: user.id,
        })
        .select()
        .single();

      if (dormError || !newDorm) {
        throw new Error(dormError?.message || "Failed to create dorm");
      }

      // 2. Insert creator as Admin in dorm_members
      const effectiveMoveIn = moveInDate || new Date().toISOString().split("T")[0];
      const { error: memberError } = await supabase
        .from("dorm_members")
        .insert({
          dorm_id: newDorm.id,
          user_id: user.id,
          role: "admin",
          move_in_date: effectiveMoveIn,
          status: "active",
        });

      if (memberError) {
        // Rollback dorm creation if membership insertion fails
        await supabase.from("dorms").delete().eq("id", newDorm.id);
        throw new Error(memberError.message || "Failed to add creator as member");
      }

      await loadDormData(newDorm.id);
      return newDorm;
    },
    [getClient, user, loadDormData]
  );

  // Validate an invite code without joining
  const validateInviteCode = useCallback(
    async (
      code: string
    ): Promise<{
      valid: boolean;
      dorm?: Dorm;
      invite?: DormInvite;
      error?: string;
    }> => {
      const supabase = getClient();
      if (!supabase) return { valid: false, error: "Database not connected" };

      const cleanCode = normalizeInviteCode(code);
      if (!cleanCode) return { valid: false, error: "Please enter an invite code" };

      const { data: invite, error: inviteError } = await supabase
        .from("dorm_invites")
        .select("*")
        .eq("code", cleanCode)
        .single();

      if (inviteError || !invite) {
        return { valid: false, error: "Invalid invite code. Please check and try again." };
      }

      if (invite.is_used) {
        return { valid: false, error: "This invite code has already been used." };
      }

      if (isInviteExpired(invite.expires_at)) {
        return { valid: false, error: "This invite code has expired (24-hour limit)." };
      }

      // Fetch the dorm details
      const { data: dorm, error: dormError } = await supabase
        .from("dorms")
        .select("*")
        .eq("id", invite.dorm_id)
        .single();

      if (dormError || !dorm) {
        return { valid: false, error: "Dorm not found for this invite code." };
      }

      return { valid: true, dorm, invite };
    },
    [getClient]
  );

  // Join a dorm via invite code
  const joinDormByCode = useCallback(
    async (code: string, moveInDate?: string): Promise<Dorm> => {
      const supabase = getClient();
      if (!supabase || !user) throw new Error("User not authenticated");

      const validation = await validateInviteCode(code);
      if (!validation.valid || !validation.dorm || !validation.invite) {
        throw new Error(validation.error || "Invalid invite code");
      }

      const dorm = validation.dorm;
      const effectiveMoveIn = moveInDate || new Date().toISOString().split("T")[0];

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from("dorm_members")
        .select("id, status")
        .eq("dorm_id", dorm.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingMember) {
        if (existingMember.status === "active") {
          throw new Error("You are already an active member of this dorm!");
        } else {
          // Reactivate inactive member
          const { error: reactivateErr } = await supabase
            .from("dorm_members")
            .update({
              status: "active",
              move_in_date: effectiveMoveIn,
              move_out_date: null,
            })
            .eq("id", existingMember.id);

          if (reactivateErr) throw reactivateErr;
        }
      } else {
        // Insert new member
        const { error: joinError } = await supabase.from("dorm_members").insert({
          dorm_id: dorm.id,
          user_id: user.id,
          role: "member",
          move_in_date: effectiveMoveIn,
          status: "active",
        });

        if (joinError) throw joinError;
      }

      // Mark invite as used
      await supabase
        .from("dorm_invites")
        .update({ is_used: true })
        .eq("id", validation.invite.id);

      await loadDormData(dorm.id);
      return dorm;
    },
    [getClient, user, validateInviteCode, loadDormData]
  );

  // Generate a new 6-char invite code with 24h expiry
  const createInvite = useCallback(
    async (dormId?: string): Promise<DormInvite> => {
      const supabase = getClient();
      if (!supabase || !user) throw new Error("User not authenticated");

      const targetDormId = dormId || state.activeDorm?.id;
      if (!targetDormId) throw new Error("No active dorm selected");

      let uniqueCode = "";
      let attempts = 0;

      // Ensure code uniqueness
      while (attempts < 5) {
        uniqueCode = generateInviteCode(6);
        const { data: existing } = await supabase
          .from("dorm_invites")
          .select("id")
          .eq("code", uniqueCode)
          .maybeSingle();

        if (!existing) break;
        attempts++;
      }

      const expiresAt = getInviteExpirationDate(24);

      const { data: invite, error } = await supabase
        .from("dorm_invites")
        .insert({
          dorm_id: targetDormId,
          code: uniqueCode,
          invited_by: user.id,
          expires_at: expiresAt,
          is_used: false,
        })
        .select()
        .single();

      if (error || !invite) {
        throw new Error(error?.message || "Failed to generate invite code");
      }

      // Update state immediately
      setState((prev) => ({
        ...prev,
        activeInvites: [invite, ...prev.activeInvites],
      }));

      return invite;
    },
    [getClient, user, state.activeDorm]
  );

  // Update member role (admin only)
  const updateMemberRole = useCallback(
    async (memberId: string, newRole: "admin" | "member") => {
      const supabase = getClient();
      if (!supabase) return;

      const { error } = await supabase
        .from("dorm_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        members: prev.members.map((m) =>
          m.id === memberId ? { ...m, role: newRole } : m
        ),
      }));
    },
    [getClient]
  );

  // Set member status (e.g. mark inactive / move-out)
  const setMemberStatus = useCallback(
    async (
      memberId: string,
      status: "active" | "inactive",
      moveOutDate?: string
    ) => {
      const supabase = getClient();
      if (!supabase) return;

      const effectiveMoveOut =
        status === "inactive"
          ? moveOutDate || new Date().toISOString().split("T")[0]
          : null;

      const { error } = await supabase
        .from("dorm_members")
        .update({
          status,
          move_out_date: effectiveMoveOut,
        })
        .eq("id", memberId);

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        members: prev.members.map((m) =>
          m.id === memberId
            ? { ...m, status, move_out_date: effectiveMoveOut }
            : m
        ),
      }));
    },
    [getClient]
  );

  // Remove member completely
  const removeMember = useCallback(
    async (memberId: string) => {
      const supabase = getClient();
      if (!supabase) return;

      const { error } = await supabase
        .from("dorm_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m.id !== memberId),
      }));
    },
    [getClient]
  );

  // Leave active dorm
  const leaveDorm = useCallback(
    async (dormId?: string) => {
      const supabase = getClient();
      if (!supabase || !user) throw new Error("User not authenticated");

      const targetDormId = dormId || state.activeDorm?.id;
      if (!targetDormId) return;

      const { error } = await supabase
        .from("dorm_members")
        .delete()
        .eq("dorm_id", targetDormId)
        .eq("user_id", user.id);

      if (error) throw error;

      if (typeof window !== "undefined") {
        localStorage.removeItem(ACTIVE_DORM_STORAGE_KEY);
      }

      await loadDormData();
    },
    [getClient, user, state.activeDorm, loadDormData]
  );

  return {
    ...state,
    createDorm,
    joinDormByCode,
    validateInviteCode,
    createInvite,
    updateMemberRole,
    setMemberStatus,
    removeMember,
    leaveDorm,
    switchActiveDorm,
    refreshDorm: loadDormData,
  };
}

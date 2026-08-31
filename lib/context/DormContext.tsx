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
import { useAuth } from "./AuthContext";
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

export interface DormContextType {
  dorms: Dorm[];
  activeDorm: Dorm | null;
  members: DormMemberWithProfile[];
  activeInvites: DormInvite[];
  userMembership: DormMember | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  createDorm: (name: string, moveInDate?: string) => Promise<Dorm>;
  joinDormByCode: (code: string, moveInDate?: string) => Promise<Dorm>;
  validateInviteCode: (code: string) => Promise<{
    valid: boolean;
    dorm?: Dorm;
    invite?: DormInvite;
    error?: string;
  }>;
  createInvite: (dormId?: string) => Promise<DormInvite>;
  updateMemberRole: (
    memberId: string,
    newRole: "admin" | "member"
  ) => Promise<void>;
  setMemberStatus: (
    memberId: string,
    status: "active" | "inactive",
    moveOutDate?: string
  ) => Promise<void>;
  removeMember: (
    memberId: string,
    strategy?: "redistribute_equally" | "absorb_by_admin" | "keep_on_record"
  ) => Promise<void>;
  leaveDorm: (dormId?: string) => Promise<void>;
  switchActiveDorm: (dormId: string) => void;
  refreshDorm: (preferredDormId?: string) => Promise<void>;
}

const DormContext = createContext<DormContextType | undefined>(undefined);
const ACTIVE_DORM_STORAGE_KEY = "hatian_active_dorm_id";

export function DormProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [dorms, setDorms] = useState<Dorm[]>([]);
  const [activeDorm, setActiveDorm] = useState<Dorm | null>(null);
  const [members, setMembers] = useState<DormMemberWithProfile[]>([]);
  const [activeInvites, setActiveInvites] = useState<DormInvite[]>([]);
  const [userMembership, setUserMembership] = useState<DormMember | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabaseRef = useRef<ReturnType<typeof getSupabaseClient> | null>(null);
  const getClient = useCallback(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = getSupabaseClient();
    }
    return supabaseRef.current;
  }, []);

  const fetchDormMembers = useCallback(
    async (dormId: string): Promise<DormMemberWithProfile[]> => {
      const supabase = getClient();
      if (!supabase) return [];

      const { data: mems, error: membersError } = await supabase
        .from("dorm_members")
        .select("*")
        .eq("dorm_id", dormId)
        .order("created_at", { ascending: true });

      if (membersError || !mems) return [];

      const userIds = mems.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      const profileMap = new Map<string, Profile>();
      profiles?.forEach((p) => profileMap.set(p.id, p));

      return mems.map((m) => ({
        ...m,
        profile: profileMap.get(m.user_id) || null,
      }));
    },
    [getClient]
  );

  const fetchDormInvites = useCallback(
    async (dormId: string): Promise<DormInvite[]> => {
      const supabase = getClient();
      if (!supabase) return [];

      const { data: invites } = await supabase
        .from("dorm_invites")
        .select("*")
        .eq("dorm_id", dormId)
        .order("created_at", { ascending: false });

      return invites || [];
    },
    [getClient]
  );

  const loadDormData = useCallback(
    async (preferredDormId?: string) => {
      const supabase = getClient();
      if (!supabase || !user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data: memberships, error: memError } = await supabase
          .from("dorm_members")
          .select("dorm_id")
          .eq("user_id", user.id);

        if (memError) throw memError;

        if (!memberships || memberships.length === 0) {
          setDorms([]);
          setActiveDorm(null);
          setMembers([]);
          setActiveInvites([]);
          setUserMembership(null);
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        const dormIds = memberships.map((m) => m.dorm_id);

        const { data: fetchedDorms, error: dormError } = await supabase
          .from("dorms")
          .select("*")
          .in("id", dormIds)
          .order("created_at", { ascending: false });

        if (dormError) throw dormError;
        if (!fetchedDorms || fetchedDorms.length === 0) {
          setDorms([]);
          setActiveDorm(null);
          setMembers([]);
          setActiveInvites([]);
          setUserMembership(null);
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        const savedDormId =
          preferredDormId ||
          (typeof window !== "undefined"
            ? localStorage.getItem(ACTIVE_DORM_STORAGE_KEY)
            : null);

        const active =
          fetchedDorms.find((d) => d.id === savedDormId) || fetchedDorms[0];

        if (typeof window !== "undefined" && active) {
          localStorage.setItem(ACTIVE_DORM_STORAGE_KEY, active.id);
        }

        const [mems, invites] = await Promise.all([
          fetchDormMembers(active.id),
          fetchDormInvites(active.id),
        ]);

        const myMembership =
          mems.find((m) => m.user_id === user.id) || null;

        setDorms(fetchedDorms);
        setActiveDorm(active);
        setMembers(mems);
        setActiveInvites(invites);
        setUserMembership(myMembership);
        setIsAdmin(myMembership?.role === "admin");
        setIsLoading(false);
      } catch (err) {
        console.warn("Dorm load notice:", err);
        setDorms([]);
        setActiveDorm(null);
        setMembers([]);
        setActiveInvites([]);
        setUserMembership(null);
        setIsAdmin(false);
        setIsLoading(false);
      }
    },
    [getClient, user, fetchDormMembers, fetchDormInvites]
  );

  // Load once when user is available
  useEffect(() => {
    if (user?.id) {
      loadDormData();
    } else {
      setIsLoading(false);
    }
  }, [user?.id, loadDormData]);

  // Realtime updates on active dorm
  useEffect(() => {
    const supabase = getClient();
    if (!supabase || !activeDorm?.id) return;

    const dormId = activeDorm.id;
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
          fetchDormMembers(dormId).then((mems) => setMembers(mems));
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
          fetchDormInvites(dormId).then((invs) => setActiveInvites(invs));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [getClient, activeDorm?.id, fetchDormMembers, fetchDormInvites]);

  const switchActiveDorm = useCallback(
    (dormId: string) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(ACTIVE_DORM_STORAGE_KEY, dormId);
      }
      loadDormData(dormId);
    },
    [loadDormData]
  );

  const createDorm = useCallback(
    async (name: string, moveInDate?: string): Promise<Dorm> => {
      const supabase = getClient();
      if (!supabase || !user) throw new Error("User not authenticated");

      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("Dorm name cannot be empty");

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

      const effectiveMoveIn =
        moveInDate || new Date().toISOString().split("T")[0];

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
        await supabase.from("dorms").delete().eq("id", newDorm.id);
        throw new Error(memberError.message || "Failed to add creator as member");
      }

      await loadDormData(newDorm.id);
      return newDorm;
    },
    [getClient, user, loadDormData]
  );

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
        return {
          valid: false,
          error: "Invalid invite code. Please check and try again.",
        };
      }

      if (invite.is_used) {
        return { valid: false, error: "This invite code has already been used." };
      }

      if (isInviteExpired(invite.expires_at)) {
        return {
          valid: false,
          error: "This invite code has expired (24-hour limit).",
        };
      }

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

  const joinDormByCode = useCallback(
    async (code: string, moveInDate?: string): Promise<Dorm> => {
      const supabase = getClient();
      if (!supabase || !user) throw new Error("User not authenticated");

      const validation = await validateInviteCode(code);
      if (!validation.valid || !validation.dorm || !validation.invite) {
        throw new Error(validation.error || "Invalid invite code");
      }

      const dorm = validation.dorm;
      const effectiveMoveIn =
        moveInDate || new Date().toISOString().split("T")[0];

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
        const { error: joinError } = await supabase
          .from("dorm_members")
          .insert({
            dorm_id: dorm.id,
            user_id: user.id,
            role: "member",
            move_in_date: effectiveMoveIn,
            status: "active",
          });

        if (joinError) throw joinError;
      }

      await supabase
        .from("dorm_invites")
        .update({ is_used: true })
        .eq("id", validation.invite.id);

      await loadDormData(dorm.id);
      return dorm;
    },
    [getClient, user, validateInviteCode, loadDormData]
  );

  const createInvite = useCallback(
    async (dormId?: string): Promise<DormInvite> => {
      const supabase = getClient();
      if (!supabase || !user) throw new Error("User not authenticated");

      const targetDormId = dormId || activeDorm?.id;
      if (!targetDormId) throw new Error("No active dorm selected");

      let uniqueCode = "";
      let attempts = 0;

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

      setActiveInvites((prev) => [invite, ...prev]);
      return invite;
    },
    [getClient, user, activeDorm?.id]
  );

  const updateMemberRole = useCallback(
    async (memberId: string, newRole: "admin" | "member") => {
      const supabase = getClient();
      if (!supabase) return;

      const { error } = await supabase
        .from("dorm_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    },
    [getClient]
  );

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

      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? { ...m, status, move_out_date: effectiveMoveOut }
            : m
        ),
      );
    },
    [getClient]
  );

  const removeMember = useCallback(
    async (
      memberId: string,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _strategy?: "redistribute_equally" | "absorb_by_admin" | "keep_on_record"
    ) => {
      const supabase = getClient();
      if (!supabase) return;

      const { error } = await supabase
        .from("dorm_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    },
    [getClient]
  );

  const leaveDorm = useCallback(
    async (dormId?: string) => {
      const supabase = getClient();
      if (!supabase || !user) throw new Error("User not authenticated");

      const targetDormId = dormId || activeDorm?.id;
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
    [getClient, user, activeDorm?.id, loadDormData]
  );

  const value = useMemo(
    () => ({
      dorms,
      activeDorm,
      members,
      activeInvites,
      userMembership,
      isAdmin,
      isLoading,
      error,
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
    }),
    [
      dorms,
      activeDorm,
      members,
      activeInvites,
      userMembership,
      isAdmin,
      isLoading,
      error,
      createDorm,
      joinDormByCode,
      validateInviteCode,
      createInvite,
      updateMemberRole,
      setMemberStatus,
      removeMember,
      leaveDorm,
      switchActiveDorm,
      loadDormData,
    ]
  );

  return <DormContext.Provider value={value}>{children}</DormContext.Provider>;
}

export function useDorm(): DormContextType {
  const context = useContext(DormContext);
  if (!context) {
    throw new Error("useDorm must be used within a DormProvider");
  }
  return context;
}

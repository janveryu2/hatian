"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";
import { useDorm } from "./useDorm";
import type {
  Bill,
  BillShare,
  BillCategory,
  Profile,
} from "@/lib/supabase/types";
import { calculateSplit, type SplitOptions } from "@/lib/engine/split";

export interface BillShareWithProfile extends BillShare {
  profile: Profile | null;
  userName?: string;
}

export interface BillWithDetails extends Bill {
  category: BillCategory | null;
  creatorProfile: Profile | null;
  payerProfile: Profile | null;
  shares: BillShareWithProfile[];
  userShare: BillShare | null;
  myOwedCentavos: number;
  myPaidCentavos: number;
  isFullySettled: boolean;
}

export function useBills() {
  const { user } = useAuth();
  const { activeDorm } = useDorm();

  const [bills, setBills] = useState<BillWithDetails[]>([]);
  const [categories, setCategories] = useState<BillCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabaseRef = useRef<ReturnType<typeof getSupabaseClient> | null>(null);
  const getClient = useCallback(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = getSupabaseClient();
    }
    return supabaseRef.current;
  }, []);

  // Fetch categories (predefined + dorm-specific)
  const fetchCategories = useCallback(
    async (dormId: string): Promise<BillCategory[]> => {
      const supabase = getClient();
      if (!supabase) return [];

      const { data, error } = await supabase
        .from("bill_categories")
        .select("*")
        .or(`dorm_id.is.null,dorm_id.eq.${dormId}`)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Error fetching categories:", error);
        return [];
      }
      return data || [];
    },
    [getClient]
  );

  // Fetch all bills with shares and profiles for the active dorm
  const loadBills = useCallback(async () => {
    const supabase = getClient();
    if (!supabase || !activeDorm || !user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch categories
      const fetchedCategories = await fetchCategories(activeDorm.id);
      setCategories(fetchedCategories);
      const catMap = new Map<string, BillCategory>();
      fetchedCategories.forEach((c) => catMap.set(c.id, c));

      // 2. Fetch bills
      const { data: billsData, error: billsError } = await supabase
        .from("bills")
        .select("*")
        .eq("dorm_id", activeDorm.id)
        .order("due_date", { ascending: false });

      if (billsError) throw billsError;

      if (!billsData || billsData.length === 0) {
        setBills([]);
        setIsLoading(false);
        return;
      }

      const billIds = billsData.map((b) => b.id);

      // 3. Fetch all shares for these bills
      const { data: sharesData, error: sharesError } = await supabase
        .from("bill_shares")
        .select("*")
        .in("bill_id", billIds);

      if (sharesError) throw sharesError;

      // 4. Fetch profiles of creators and payers
      const userIds = new Set<string>();
      billsData.forEach((b) => {
        userIds.add(b.created_by);
        userIds.add(b.paid_by);
      });
      sharesData?.forEach((s) => {
        // memberId is dorm_member id, we can match with dorm members
      });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", Array.from(userIds));

      const profileMap = new Map<string, Profile>();
      profiles?.forEach((p) => profileMap.set(p.id, p));

      // Also get dorm_members to map memberId -> user_id -> profile
      const { data: dormMembers } = await supabase
        .from("dorm_members")
        .select("id, user_id")
        .eq("dorm_id", activeDorm.id);

      const memberToUserMap = new Map<string, string>();
      dormMembers?.forEach((dm) => memberToUserMap.set(dm.id, dm.user_id));

      // Fetch all member profiles
      const memberUserIds = dormMembers?.map((dm) => dm.user_id) || [];
      const { data: allMemberProfiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", memberUserIds);

      allMemberProfiles?.forEach((p) => profileMap.set(p.id, p));

      // Map shares by bill_id
      const sharesByBill = new Map<string, BillShareWithProfile[]>();
      sharesData?.forEach((s) => {
        const userId = memberToUserMap.get(s.member_id);
        const prof = userId ? profileMap.get(userId) || null : null;
        const list = sharesByBill.get(s.bill_id) || [];
        list.push({
          ...s,
          profile: prof,
          userName: prof?.display_name || prof?.email || "Roommate",
        });
        sharesByBill.set(s.bill_id, list);
      });

      // Find user's dorm_member id in this dorm
      const myDormMember = dormMembers?.find((dm) => dm.user_id === user.id);
      const myMemberId = myDormMember?.id;

      // 5. Assemble enriched bills
      const enriched: BillWithDetails[] = billsData.map((b) => {
        const billShares = sharesByBill.get(b.id) || [];
        const userShare = myMemberId
          ? billShares.find((s) => s.member_id === myMemberId) || null
          : null;

        const isFullySettled =
          billShares.length > 0 &&
          billShares.every(
            (s) =>
              s.payment_status === "confirmed" ||
              s.amount_paid_centavos >= s.amount_owed_centavos
          );

        return {
          ...b,
          category: catMap.get(b.category_id) || null,
          creatorProfile: profileMap.get(b.created_by) || null,
          payerProfile: profileMap.get(b.paid_by) || null,
          shares: billShares,
          userShare,
          myOwedCentavos: userShare?.amount_owed_centavos || 0,
          myPaidCentavos: userShare?.amount_paid_centavos || 0,
          isFullySettled,
        };
      });

      setBills(enriched);
      setIsLoading(false);
    } catch (err: unknown) {
      console.error("useBills error:", err);
      setError(err instanceof Error ? err.message : "Failed to load bills");
      setIsLoading(false);
    }
  }, [getClient, activeDorm, user, fetchCategories]);

  // Initial load
  useEffect(() => {
    loadBills();
  }, [loadBills]);

  // Realtime subscription on bills and bill_shares
  useEffect(() => {
    const supabase = getClient();
    if (!supabase || !activeDorm) return;

    const channel = supabase
      .channel(`bills_realtime_${activeDorm.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bills",
          filter: `dorm_id=eq.${activeDorm.id}`,
        },
        () => {
          loadBills();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bill_shares",
        },
        () => {
          loadBills();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [getClient, activeDorm, loadBills]);

  // Create a new bill with calculated shares
  const createBill = useCallback(
    async (
      billData: {
        categoryId: string;
        amountCentavos: number;
        billingPeriodStart: string;
        billingPeriodEnd: string;
        dueDate: string;
        paidBy: string; // user_id
      },
      splitConfig: Omit<
        SplitOptions,
        "totalAmountCentavos" | "creatorId" | "billingPeriodStart" | "billingPeriodEnd"
      >
    ): Promise<Bill> => {
      const supabase = getClient();
      if (!supabase || !user || !activeDorm) {
        throw new Error("User or active dorm not found");
      }

      // 1. Calculate shares using Split Engine
      const calculation = calculateSplit({
        ...splitConfig,
        totalAmountCentavos: billData.amountCentavos,
        creatorId: user.id,
        billingPeriodStart: billData.billingPeriodStart,
        billingPeriodEnd: billData.billingPeriodEnd,
      });

      // 2. Insert Bill row
      const { data: newBill, error: billError } = await supabase
        .from("bills")
        .insert({
          dorm_id: activeDorm.id,
          category_id: billData.categoryId,
          amount_centavos: billData.amountCentavos,
          billing_period_start: billData.billingPeriodStart,
          billing_period_end: billData.billingPeriodEnd,
          due_date: billData.dueDate,
          created_by: user.id,
          paid_by: billData.paidBy,
          status: "active",
          split_method: splitConfig.method,
          version: 1,
        })
        .select()
        .single();

      if (billError || !newBill) {
        throw new Error(billError?.message || "Failed to create bill");
      }

      // 3. Map participant user_id to dorm_member id
      const { data: dormMembers } = await supabase
        .from("dorm_members")
        .select("id, user_id")
        .eq("dorm_id", activeDorm.id);

      const userToMemberMap = new Map<string, string>();
      dormMembers?.forEach((dm) => userToMemberMap.set(dm.user_id, dm.id));

      // 4. Insert Bill Shares
      const shareInserts = calculation.shares
        .map((share) => {
          const memberId = userToMemberMap.get(share.memberId);
          if (!memberId) return null;

          const isPayer = share.memberId === billData.paidBy;

          return {
            bill_id: newBill.id,
            member_id: memberId,
            amount_owed_centavos: share.amountCentavos,
            amount_paid_centavos: isPayer ? share.amountCentavos : 0,
            payment_status: isPayer
              ? ("confirmed" as const)
              : ("unpaid" as const),
            paid_at: isPayer ? new Date().toISOString() : null,
            confirmed_at: isPayer ? new Date().toISOString() : null,
          };
        })
        .filter(Boolean);

      if (shareInserts.length > 0) {
        const { error: sharesError } = await supabase
          .from("bill_shares")
          .insert(shareInserts as NonNullable<(typeof shareInserts)[0]>[]);

        if (sharesError) {
          console.error("Error inserting shares:", sharesError);
        }
      }

      await loadBills();
      return newBill;
    },
    [getClient, user, activeDorm, loadBills]
  );

  // Mark a roommate's share as paid (initiated by roommate)
  const markSharePaid = useCallback(
    async (shareId: string) => {
      const supabase = getClient();
      if (!supabase) return;

      const { error } = await supabase
        .from("bill_shares")
        .update({
          payment_status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", shareId);

      if (error) throw error;
      await loadBills();
    },
    [getClient, loadBills]
  );

  // Confirm payment of a share (approved by bill payer / creator)
  const confirmSharePaid = useCallback(
    async (shareId: string) => {
      const supabase = getClient();
      if (!supabase || !user) return;

      const { error } = await supabase
        .from("bill_shares")
        .update({
          payment_status: "confirmed",
          confirmed_at: new Date().toISOString(),
          confirmed_by: user.id,
        })
        .eq("id", shareId);

      if (error) throw error;
      await loadBills();
    },
    [getClient, user, loadBills]
  );

  // Delete a bill (admin or creator)
  const deleteBill = useCallback(
    async (billId: string) => {
      const supabase = getClient();
      if (!supabase) return;

      const { error } = await supabase.from("bills").delete().eq("id", billId);
      if (error) throw error;
      await loadBills();
    },
    [getClient, loadBills]
  );

  // Add custom category for dorm
  const addCategory = useCallback(
    async (name: string, icon = "📦") => {
      const supabase = getClient();
      if (!supabase || !activeDorm) return;

      const { data, error } = await supabase
        .from("bill_categories")
        .insert({
          dorm_id: activeDorm.id,
          name: name.trim(),
          icon,
          is_predefined: false,
          sort_order: categories.length,
        })
        .select()
        .single();

      if (error) throw error;
      setCategories((prev) => [...prev, data]);
      return data;
    },
    [getClient, activeDorm, categories.length]
  );

  return {
    bills,
    categories,
    isLoading,
    error,
    createBill,
    markSharePaid,
    confirmSharePaid,
    deleteBill,
    addCategory,
    refreshBills: loadBills,
  };
}

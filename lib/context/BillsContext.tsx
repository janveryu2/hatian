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
import { useDorm } from "./DormContext";
import type {
  Bill,
  BillShare,
  BillCategory,
  Profile,
} from "@/lib/supabase/types";
import {
  calculateSplit,
  daysBetween,
  recalculateSharesFromDaysPresent,
  recalculateSharesWithProvisionalStatus,
  type SplitOptions,
} from "@/lib/engine/split";

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
  isProvisional: boolean;
  unconfirmedCount: number;
  unconfirmedNames: string[];
}

export interface BillsContextType {
  bills: BillWithDetails[];
  categories: BillCategory[];
  isLoading: boolean;
  error: string | null;
  createBill: (
    billData: {
      categoryId: string;
      amountCentavos: number;
      billingPeriodStart: string;
      billingPeriodEnd: string;
      dueDate: string;
      paidBy: string;
    },
    splitConfig: Omit<
      SplitOptions,
      "totalAmountCentavos" | "creatorId" | "billingPeriodStart" | "billingPeriodEnd"
    >
  ) => Promise<Bill>;
  updateShareDays: (
    billId: string,
    shareId: string,
    newDays: number
  ) => Promise<void>;
  acknowledgeShare: (shareId: string) => Promise<void>;
  markSharePaid: (shareId: string) => Promise<void>;
  confirmSharePaid: (shareId: string) => Promise<void>;
  deleteBill: (billId: string) => Promise<void>;
  addCategory: (name: string, icon?: string) => Promise<BillCategory | undefined>;
  refreshBills: () => Promise<void>;
}

const BillsContext = createContext<BillsContextType | undefined>(undefined);

export function BillsProvider({ children }: { children: React.ReactNode }) {
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

  const fetchCategories = useCallback(
    async (dormId: string): Promise<BillCategory[]> => {
      const supabase = getClient();
      if (!supabase) return [];

      const { data } = await supabase
        .from("bill_categories")
        .select("*")
        .or(`dorm_id.is.null,dorm_id.eq.${dormId}`)
        .order("sort_order", { ascending: true });

      return data || [];
    },
    [getClient]
  );

  const loadBills = useCallback(async () => {
    const supabase = getClient();
    if (!supabase || !activeDorm || !user) {
      setBills([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const fetchedCategories = await fetchCategories(activeDorm.id);
      setCategories(fetchedCategories);
      const catMap = new Map<string, BillCategory>();
      fetchedCategories.forEach((c) => catMap.set(c.id, c));

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

      const { data: sharesData, error: sharesError } = await supabase
        .from("bill_shares")
        .select("*")
        .in("bill_id", billIds);

      if (sharesError) throw sharesError;

      const userIds = new Set<string>();
      billsData.forEach((b) => {
        userIds.add(b.created_by);
        userIds.add(b.paid_by);
      });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", Array.from(userIds));

      const profileMap = new Map<string, Profile>();
      profiles?.forEach((p) => profileMap.set(p.id, p));

      const { data: dormMembers } = await supabase
        .from("dorm_members")
        .select("id, user_id")
        .eq("dorm_id", activeDorm.id);

      const memberToUserMap = new Map<string, string>();
      dormMembers?.forEach((dm) => memberToUserMap.set(dm.id, dm.user_id));

      const memberUserIds = dormMembers?.map((dm) => dm.user_id) || [];
      const { data: allMemberProfiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", memberUserIds);

      allMemberProfiles?.forEach((p) => profileMap.set(p.id, p));

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

      const myDormMember = dormMembers?.find((dm) => dm.user_id === user.id);
      const myMemberId = myDormMember?.id;

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

        const unconfirmedShares = billShares.filter(
          (s) => !s.is_days_confirmed && s.days_present === null
        );
        const isProvisional = unconfirmedShares.length > 0;
        const unconfirmedNames = unconfirmedShares.map(
          (s) => s.userName || "Roommate"
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
          isProvisional,
          unconfirmedCount: unconfirmedShares.length,
          unconfirmedNames,
        };
      });

      setBills(enriched);
      setIsLoading(false);
    } catch (err) {
      console.warn("Bills load notice:", err);
      setBills([]);
      setIsLoading(false);
    }
  }, [getClient, activeDorm?.id, user?.id, fetchCategories]);

  useEffect(() => {
    if (activeDorm?.id && user?.id) {
      loadBills();
    } else {
      setBills([]);
      setIsLoading(false);
    }
  }, [activeDorm?.id, user?.id, loadBills]);

  // Realtime updates on bills and shares
  useEffect(() => {
    const supabase = getClient();
    if (!supabase || !activeDorm?.id) return;

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
  }, [getClient, activeDorm?.id, loadBills]);

  const createBill = useCallback(
    async (
      billData: {
        categoryId: string;
        amountCentavos: number;
        billingPeriodStart: string;
        billingPeriodEnd: string;
        dueDate: string;
        paidBy: string;
      },
      splitConfig: Omit<
        SplitOptions,
        "totalAmountCentavos" | "creatorId" | "billingPeriodStart" | "billingPeriodEnd"
      >
    ): Promise<Bill> => {
      const supabase = getClient();
      if (!supabase || !user || !activeDorm) {
        throw new Error("Missing auth or dorm context");
      }

      // 1. Insert Bill record
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

      const { data: dormMembers } = await supabase
        .from("dorm_members")
        .select("id, user_id")
        .eq("dorm_id", activeDorm.id);

      const defaultCycleDays = daysBetween(
        billData.billingPeriodStart,
        billData.billingPeriodEnd
      );

      const rawSharesToCalc = (dormMembers || []).map((dm) => {
        const isCreator = dm.user_id === user.id;
        const memberDays = isCreator
          ? splitConfig.daysPresent?.[dm.user_id] ?? defaultCycleDays
          : null;

        return {
          id: dm.id,
          memberId: dm.id,
          daysPresent: memberDays,
          isDaysConfirmed: isCreator,
        };
      });

      const { shares: initialShares } = recalculateSharesWithProvisionalStatus(
        billData.amountCentavos,
        rawSharesToCalc,
        billData.paidBy,
        defaultCycleDays
      );

      const shareInserts = (dormMembers || []).map((dm) => {
        const isCreator = dm.user_id === user.id;
        const isPayer = dm.user_id === billData.paidBy;
        const match = initialShares.find((s) => s.memberId === dm.id);
        const amt = match?.amountOwedCentavos ?? 0;
        const memberDays = isCreator
          ? splitConfig.daysPresent?.[dm.user_id] ?? defaultCycleDays
          : null;

        return {
          bill_id: newBill.id,
          member_id: dm.id,
          amount_owed_centavos: amt,
          amount_paid_centavos: isPayer ? amt : 0,
          payment_status: isPayer
            ? ("confirmed" as const)
            : ("unpaid" as const),
          days_present: memberDays,
          is_days_confirmed: isCreator,
          paid_at: isPayer ? new Date().toISOString() : null,
          confirmed_at: isPayer ? new Date().toISOString() : null,
        };
      });

      if (shareInserts.length > 0) {
        await supabase.from("bill_shares").insert(shareInserts);
      }

      await loadBills();
      return newBill;
    },
    [getClient, user, activeDorm, loadBills]
  );

  const updateShareDays = useCallback(
    async (billId: string, shareId: string, newDays: number) => {
      const supabase = getClient();
      if (!supabase) return;

      const targetBill = bills.find((b) => b.id === billId);
      if (!targetBill) return;

      const cycleDays = daysBetween(
        targetBill.billing_period_start,
        targetBill.billing_period_end
      );

      const rawShares = targetBill.shares.map((s) => ({
        id: s.id,
        memberId: s.member_id,
        daysPresent:
          s.id === shareId
            ? newDays
            : typeof s.days_present === "number"
            ? s.days_present
            : null,
        isDaysConfirmed: s.id === shareId ? true : s.is_days_confirmed ?? false,
      }));

      const { shares: recalculated } = recalculateSharesWithProvisionalStatus(
        targetBill.amount_centavos,
        rawShares,
        targetBill.paid_by,
        cycleDays
      );

      const recalMap = new Map(recalculated.map((r) => [r.id, r]));

      // Optimistically update local state immediately
      setBills((prev) =>
        prev.map((b) => {
          if (b.id !== billId) return b;
          const updatedShares = b.shares.map((s) => {
            const r = recalMap.get(s.id);
            if (!r) return s;
            return {
              ...s,
              days_present: r.daysPresent,
              is_days_confirmed: r.isDaysConfirmed,
              amount_owed_centavos: r.amountOwedCentavos,
            };
          });

          const myUpdatedShare =
            updatedShares.find((s) => s.profile?.id === user?.id) || null;

          const unconfirmedShares = updatedShares.filter(
            (s) => !s.is_days_confirmed && s.days_present === null
          );

          return {
            ...b,
            shares: updatedShares,
            userShare: myUpdatedShare || b.userShare,
            myOwedCentavos:
              myUpdatedShare?.amount_owed_centavos ?? b.myOwedCentavos,
            isProvisional: unconfirmedShares.length > 0,
            unconfirmedCount: unconfirmedShares.length,
            unconfirmedNames: unconfirmedShares.map(
              (s) => s.userName || "Roommate"
            ),
          };
        })
      );

      // Persist recalculated shares to Supabase
      const updates = recalculated.map((r) =>
        supabase
          .from("bill_shares")
          .update({
            days_present: r.daysPresent,
            is_days_confirmed: r.isDaysConfirmed,
            amount_owed_centavos: r.amountOwedCentavos,
          })
          .eq("id", r.id)
      );

      await Promise.all(updates);
    },
    [getClient, bills, user?.id]
  );

  const acknowledgeShare = useCallback(
    async (shareId: string) => {
      const supabase = getClient();
      if (!supabase) return;

      const { error: ackErr } = await supabase
        .from("bill_shares")
        .update({
          payment_status: "acknowledged",
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", shareId);

      if (ackErr) throw ackErr;

      // Optimistically update
      setBills((prev) =>
        prev.map((b) => {
          const hasShare = b.shares.some((s) => s.id === shareId);
          if (!hasShare) return b;
          return {
            ...b,
            shares: b.shares.map((s) =>
              s.id === shareId
                ? {
                    ...s,
                    payment_status: "acknowledged" as const,
                    acknowledged_at: new Date().toISOString(),
                  }
                : s
            ),
          };
        })
      );
    },
    [getClient]
  );

  const markSharePaid = useCallback(
    async (shareId: string) => {
      const supabase = getClient();
      if (!supabase) return;

      const { error: markErr } = await supabase
        .from("bill_shares")
        .update({
          payment_status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", shareId);

      if (markErr) throw markErr;
      await loadBills();
    },
    [getClient, loadBills]
  );

  const confirmSharePaid = useCallback(
    async (shareId: string) => {
      const supabase = getClient();
      if (!supabase || !user) return;

      const { error: confErr } = await supabase
        .from("bill_shares")
        .update({
          payment_status: "confirmed",
          confirmed_at: new Date().toISOString(),
          confirmed_by: user.id,
        })
        .eq("id", shareId);

      if (confErr) throw confErr;
      await loadBills();
    },
    [getClient, user, loadBills]
  );

  const deleteBill = useCallback(
    async (billId: string) => {
      const supabase = getClient();
      if (!supabase) return;

      const { error: delErr } = await supabase
        .from("bills")
        .delete()
        .eq("id", billId);

      if (delErr) throw delErr;
      await loadBills();
    },
    [getClient, loadBills]
  );

  const addCategory = useCallback(
    async (name: string, icon = "📦") => {
      const supabase = getClient();
      if (!supabase || !activeDorm) return;

      const { data, error: catErr } = await supabase
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

      if (catErr) throw catErr;
      setCategories((prev) => [...prev, data]);
      return data;
    },
    [getClient, activeDorm, categories.length]
  );

  const value = useMemo(
    () => ({
      bills,
      categories,
      isLoading,
      error,
      createBill,
      updateShareDays,
      acknowledgeShare,
      markSharePaid,
      confirmSharePaid,
      deleteBill,
      addCategory,
      refreshBills: loadBills,
    }),
    [
      bills,
      categories,
      isLoading,
      error,
      createBill,
      updateShareDays,
      acknowledgeShare,
      markSharePaid,
      confirmSharePaid,
      deleteBill,
      addCategory,
      loadBills,
    ]
  );

  return (
    <BillsContext.Provider value={value}>{children}</BillsContext.Provider>
  );
}

export function useBills(): BillsContextType {
  const context = useContext(BillsContext);
  if (!context) {
    throw new Error("useBills must be used within a BillsProvider");
  }
  return context;
}

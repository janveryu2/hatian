"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";
import { useDorm } from "./useDorm";
import { useBills } from "./useBills";
import type { Payment, Profile } from "@/lib/supabase/types";
import {
  calculateNetBalances,
  simplifyDebts,
  type BalanceMember,
  type BillWithShares,
  type SimplifiedTransaction,
} from "@/lib/engine/settle";

export interface EnrichedPayment extends Payment {
  fromProfile: Profile | null;
  toProfile: Profile | null;
  fromName: string;
  toName: string;
}

export function useSettlement() {
  const { user } = useAuth();
  const { activeDorm, members } = useDorm();
  const { bills } = useBills();

  const [payments, setPayments] = useState<EnrichedPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabaseRef = useRef<ReturnType<typeof getSupabaseClient> | null>(null);
  const getClient = useCallback(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = getSupabaseClient();
    }
    return supabaseRef.current;
  }, []);

  // Fetch payments for the active dorm
  const loadPayments = useCallback(async () => {
    const supabase = getClient();
    if (!supabase || !activeDorm) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data: rawPayments, error: payError } = await supabase
        .from("payments")
        .select("*")
        .eq("dorm_id", activeDorm.id)
        .order("created_at", { ascending: false });

      if (payError) throw payError;

      if (!rawPayments || rawPayments.length === 0) {
        setPayments([]);
        setIsLoading(false);
        return;
      }

      // Map member IDs to profiles
      const memberMap = new Map(members.map((m) => [m.id, m]));

      const enriched: EnrichedPayment[] = rawPayments.map((p) => {
        const fromMem = memberMap.get(p.from_member);
        const toMem = memberMap.get(p.to_member);

        return {
          ...p,
          fromProfile: fromMem?.profile || null,
          toProfile: toMem?.profile || null,
          fromName:
            fromMem?.profile?.display_name ||
            fromMem?.profile?.email ||
            "Roommate",
          toName:
            toMem?.profile?.display_name ||
            toMem?.profile?.email ||
            "Roommate",
        };
      });

      setPayments(enriched);
      setIsLoading(false);
    } catch (err: unknown) {
      console.error("useSettlement error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load payments"
      );
      setIsLoading(false);
    }
  }, [getClient, activeDorm, members]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  // Realtime subscription for payments
  useEffect(() => {
    const supabase = getClient();
    if (!supabase || !activeDorm) return;

    const channel = supabase
      .channel(`payments_realtime_${activeDorm.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
          filter: `dorm_id=eq.${activeDorm.id}`,
        },
        () => {
          loadPayments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [getClient, activeDorm, loadPayments]);

  // Map dorm data into engine format
  const balanceMembers: BalanceMember[] = useMemo(() => {
    return members.map((m) => ({
      id: m.id,
      name: m.profile?.display_name || m.profile?.email || "Roommate",
    }));
  }, [members]);

  const userToMemberId = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.user_id, m.id));
    return map;
  }, [members]);

  const engineBills: BillWithShares[] = useMemo(() => {
    return bills.map((b) => {
      const payerMemberId = userToMemberId.get(b.paid_by) || "";
      return {
        id: b.id,
        paidBy: payerMemberId,
        amountCentavos: b.amount_centavos,
        shares: b.shares.map((s) => ({
          memberId: s.member_id,
          amountOwedCentavos: s.amount_owed_centavos,
          amountPaidCentavos: s.amount_paid_centavos,
          paymentStatus: s.payment_status,
        })),
      };
    });
  }, [bills, userToMemberId]);

  // Net balances map: member_id -> centavos (+ owed, - owes)
  const netBalances = useMemo(() => {
    const enginePayments = payments.map((p) => ({
      id: p.id,
      fromMember: p.from_member,
      toMember: p.to_member,
      amountCentavos: p.amount_centavos,
      status: p.status,
    }));
    return calculateNetBalances(balanceMembers, engineBills, enginePayments);
  }, [balanceMembers, engineBills, payments]);

  // Simplified Debt Transactions
  const simplifiedPlan: SimplifiedTransaction[] = useMemo(() => {
    return simplifyDebts(netBalances);
  }, [netBalances]);

  // Current user's member ID & balance
  const myMemberId = user ? userToMemberId.get(user.id) || null : null;
  const myNetBalance = myMemberId ? netBalances.get(myMemberId) || 0 : 0;

  // Transactions involving the current user
  const mySimplifiedDebts = useMemo(() => {
    if (!myMemberId) return [];
    return simplifiedPlan.filter(
      (p) => p.fromMember === myMemberId || p.toMember === myMemberId
    );
  }, [simplifiedPlan, myMemberId]);

  // Record a payment (Sender initiates)
  const recordPayment = useCallback(
    async (
      toMemberId: string,
      amountCentavos: number,
      note?: string
    ): Promise<Payment> => {
      const supabase = getClient();
      if (!supabase || !activeDorm || !myMemberId) {
        throw new Error("Active dorm or user membership not found");
      }

      const { data, error: payError } = await supabase
        .from("payments")
        .insert({
          dorm_id: activeDorm.id,
          from_member: myMemberId,
          to_member: toMemberId,
          amount_centavos: amountCentavos,
          note: note?.trim() || null,
          status: "pending",
        })
        .select()
        .single();

      if (payError || !data) {
        throw new Error(payError?.message || "Failed to record payment");
      }

      await loadPayments();
      return data;
    },
    [getClient, activeDorm, myMemberId, loadPayments]
  );

  // Confirm received payment (Receiver confirms)
  const confirmPayment = useCallback(
    async (paymentId: string) => {
      const supabase = getClient();
      if (!supabase) return;

      const { error: confError } = await supabase
        .from("payments")
        .update({
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

      if (confError) throw confError;
      await loadPayments();
    },
    [getClient, loadPayments]
  );

  return {
    payments,
    netBalances,
    simplifiedPlan,
    mySimplifiedDebts,
    myNetBalance,
    myMemberId,
    isLoading,
    error,
    recordPayment,
    confirmPayment,
    refreshPayments: loadPayments,
  };
}

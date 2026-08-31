"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING } from "@/lib/utils/constants";
import { pesosToCentavos, formatCentavos } from "@/lib/utils/currency";
import { calculateSplit, daysBetween, type SplitParticipant } from "@/lib/engine/split";
import type { BillCategory } from "@/lib/supabase/types";
import type { DormMemberWithProfile } from "@/lib/hooks/useDorm";

interface CreateBillModalProps {
  isOpen: boolean;
  categories: BillCategory[];
  members: DormMemberWithProfile[];
  currentUserId: string;
  onClose: () => void;
  onSubmit: (
    billData: {
      categoryId: string;
      amountCentavos: number;
      billingPeriodStart: string;
      billingPeriodEnd: string;
      dueDate: string;
      paidBy: string;
    },
    splitConfig: {
      method: "prorated_by_days" | "equal" | "percentage" | "custom_amount";
      members: SplitParticipant[];
      daysPresent?: Record<string, number>;
    }
  ) => Promise<unknown>;
  onAddCategory?: (name: string, icon: string) => Promise<BillCategory | void>;
}

export function CreateBillModal({
  isOpen,
  categories,
  members,
  currentUserId,
  onClose,
  onSubmit,
  onAddCategory,
}: CreateBillModalProps) {
  // Category & basic bill info
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    categories[0]?.id || ""
  );
  const [amountPesos, setAmountPesos] = useState("");
  const [paidById, setPaidById] = useState(currentUserId);

  // Billing period dates (default: current month)
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [periodEnd, setPeriodEnd] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().split("T")[0];
  });
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });

  // Cycle days
  const cycleDays = useMemo(() => {
    return daysBetween(periodStart, periodEnd);
  }, [periodStart, periodEnd]);

  // Days present per roommate (initialized to full cycle length)
  const [daysPresent, setDaysPresent] = useState<Record<string, number>>({});

  // Active roommates list
  const activeMembers: SplitParticipant[] = useMemo(() => {
    return members
      .filter((m) => m.status === "active")
      .map((m) => ({
        id: m.user_id,
        name: m.profile?.display_name || m.profile?.email || "Roommate",
        moveInDate: m.move_in_date,
        moveOutDate: m.move_out_date,
      }));
  }, [members]);

  // Total centavos
  const totalCentavos = useMemo(() => {
    const parsed = parseFloat(amountPesos);
    return isNaN(parsed) || parsed <= 0 ? 0 : pesosToCentavos(parsed);
  }, [amountPesos]);

  // Effective days for each roommate
  const effectiveDaysMap = useMemo(() => {
    const map: Record<string, number> = {};
    activeMembers.forEach((m) => {
      map[m.id] =
        typeof daysPresent[m.id] === "number"
          ? daysPresent[m.id]
          : cycleDays;
    });
    return map;
  }, [activeMembers, daysPresent, cycleDays]);

  // Live auto-calculated shares based on days present
  const calculation = useMemo(() => {
    if (totalCentavos <= 0 || activeMembers.length === 0) return null;

    try {
      return calculateSplit({
        method: "prorated_by_days",
        totalAmountCentavos: totalCentavos,
        members: activeMembers,
        creatorId: paidById || currentUserId,
        daysPresent: effectiveDaysMap,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
      });
    } catch {
      return null;
    }
  }, [
    totalCentavos,
    activeMembers,
    paidById,
    currentUserId,
    effectiveDaysMap,
    periodStart,
    periodEnd,
  ]);

  const totalPersonDays = useMemo(() => {
    return Object.values(effectiveDaysMap).reduce((sum, d) => sum + d, 0);
  }, [effectiveDaysMap]);

  // Inline custom category creation
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("📦");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDayChange = (userId: string, delta: number) => {
    const current = effectiveDaysMap[userId] ?? cycleDays;
    const next = Math.max(0, Math.min(cycleDays, current + delta));
    setDaysPresent((prev) => ({ ...prev, [userId]: next }));
  };

  const handleDirectDayInput = (userId: string, valueStr: string) => {
    const parsed = parseInt(valueStr, 10);
    if (isNaN(parsed)) {
      setDaysPresent((prev) => ({ ...prev, [userId]: 0 }));
    } else {
      setDaysPresent((prev) => ({
        ...prev,
        [userId]: Math.max(0, Math.min(365, parsed)),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalCentavos <= 0) {
      setError("Please enter a valid bill amount (e.g. 562.00)");
      return;
    }
    if (!selectedCategoryId) {
      setError("Please select a bill category");
      return;
    }
    if (activeMembers.length === 0) {
      setError("No active roommates found in this dorm");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await onSubmit(
        {
          categoryId: selectedCategoryId,
          amountCentavos: totalCentavos,
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd,
          dueDate,
          paidBy: paidById,
        },
        {
          method: "prorated_by_days",
          members: activeMembers,
          daysPresent: effectiveDaysMap,
        }
      );

      // Reset form
      setAmountPesos("");
      setDaysPresent({});
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create bill");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: "100%", opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={SPRING.modal}
            className="relative w-full max-w-lg bg-bg-card border border-border-subtle rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl z-10 max-h-[92vh] overflow-y-auto flex flex-col"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
            }}
          >
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-border-subtle rounded-full mx-auto mb-4 sm:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-heading-2 font-bold text-text-primary">
                  Add a Bill
                </h2>
                <p className="text-body-sm text-text-tertiary">
                  Enter days present — shares calculate automatically
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-bg-surface flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-accent-terracotta/10 border border-accent-terracotta/20 text-accent-terracotta text-body-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 flex-1">
              {/* 1. Category Selection */}
              <div>
                <label className="block text-caption font-semibold uppercase text-text-secondary mb-2">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`px-3 py-2 rounded-xl text-body-sm font-medium transition-all flex items-center gap-1.5 border ${
                          isSelected
                            ? "bg-accent-teal text-white border-accent-teal shadow-md shadow-accent-teal/20"
                            : "bg-bg-surface text-text-secondary border-border-subtle hover:border-accent-teal/40"
                        }`}
                      >
                        <span>{cat.icon || "📦"}</span>
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}

                  {onAddCategory && !isAddingCategory && (
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(true)}
                      className="px-3 py-2 rounded-xl text-body-sm font-medium border border-dashed border-border-subtle text-text-tertiary hover:text-accent-teal hover:border-accent-teal/50 transition-colors"
                    >
                      + Custom
                    </button>
                  )}
                </div>

                {/* Inline custom category input */}
                {isAddingCategory && (
                  <div className="mt-3 p-3 rounded-xl bg-bg-surface border border-border-subtle flex items-center gap-2">
                    <input
                      type="text"
                      value={newCatIcon}
                      onChange={(e) => setNewCatIcon(e.target.value)}
                      placeholder="Icon"
                      className="w-12 text-center text-body-md py-1.5 rounded-lg bg-bg-primary border border-border-subtle"
                      maxLength={2}
                    />
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="Category name"
                      className="flex-1 px-3 py-1.5 text-body-sm rounded-lg bg-bg-primary border border-border-subtle text-text-primary"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newCatName.trim()) return;
                        if (onAddCategory) {
                          const created = await onAddCategory(
                            newCatName,
                            newCatIcon
                          );
                          if (created && typeof created === "object") {
                            setSelectedCategoryId(created.id);
                          }
                        }
                        setIsAddingCategory(false);
                        setNewCatName("");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-accent-teal text-white text-caption font-semibold"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(false)}
                      className="px-2 py-1.5 text-text-tertiary text-caption"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Total Amount Input */}
              <div>
                <label className="block text-caption font-semibold uppercase text-text-secondary mb-1.5">
                  Total Bill Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-heading-3 font-semibold text-text-tertiary font-mono">
                    ₱
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amountPesos}
                    onChange={(e) => setAmountPesos(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-bg-surface border border-border-subtle text-text-primary font-mono text-heading-3 font-bold placeholder:text-text-tertiary/40 focus:border-accent-teal focus:outline-none"
                  />
                </div>
              </div>

              {/* 3. Billing Period & Paid By */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-caption font-semibold uppercase text-text-secondary mb-1">
                    Period Start
                  </label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-surface border border-border-subtle text-text-primary font-mono text-body-sm focus:border-accent-teal focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-caption font-semibold uppercase text-text-secondary mb-1">
                    Period End
                  </label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-surface border border-border-subtle text-text-primary font-mono text-body-sm focus:border-accent-teal focus:outline-none"
                  />
                </div>
              </div>

              {/* Paid By & Due Date row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-caption font-semibold uppercase text-text-secondary mb-1">
                    Paid By (Creditor)
                  </label>
                  <select
                    value={paidById}
                    onChange={(e) => setPaidById(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-surface border border-border-subtle text-text-primary text-body-sm focus:border-accent-teal focus:outline-none"
                  >
                    {activeMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.id === currentUserId ? "(You)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-caption font-semibold uppercase text-text-secondary mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-surface border border-border-subtle text-text-primary font-mono text-body-sm focus:border-accent-teal focus:outline-none"
                  />
                </div>
              </div>

              {/* 4. Roommates' Days Present (The CORE Mental Model) */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <label className="block text-caption font-semibold uppercase text-text-secondary">
                      Days Present in Dorm
                    </label>
                    <p className="text-caption text-text-tertiary">
                      Billing cycle is {cycleDays} days. Adjust days present for each roommate:
                    </p>
                  </div>
                  <span className="text-caption font-mono text-accent-teal bg-accent-teal/10 px-2.5 py-1 rounded-lg">
                    {totalPersonDays} Total Days
                  </span>
                </div>

                <div className="space-y-2.5">
                  {activeMembers.map((member) => {
                    const days = effectiveDaysMap[member.id] ?? cycleDays;
                    const share = calculation?.shares.find(
                      (s) => s.memberId === member.id
                    );
                    const isPayer = member.id === paidById;

                    return (
                      <div
                        key={member.id}
                        className="p-3.5 rounded-2xl bg-bg-surface border border-border-subtle flex items-center justify-between gap-3"
                      >
                        {/* Member Identity */}
                        <div className="min-w-0 flex-1">
                          <p className="text-body-md font-semibold text-text-primary truncate flex items-center gap-1.5">
                            {member.name}
                            {member.id === currentUserId && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-accent-teal/15 text-accent-teal shrink-0">
                                You
                              </span>
                            )}
                            {isPayer && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-accent-terracotta/15 text-accent-terracotta shrink-0">
                                Paid Bill
                              </span>
                            )}
                          </p>

                          {/* Live Calculated Share Preview */}
                          <p className="text-caption text-text-tertiary">
                            Share:{" "}
                            <span className="font-mono font-bold text-text-primary">
                              {share ? formatCentavos(share.amountCentavos) : "₱0.00"}
                            </span>
                            {totalCentavos > 0 && share && (
                              <span className="text-[11px] text-text-tertiary ml-1 font-mono">
                                ({totalPersonDays > 0 ? Math.round((days / totalPersonDays) * 100) : 0}%)
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Days Stepper Control */}
                        <div className="flex items-center gap-1.5 bg-bg-card border border-border-subtle rounded-xl p-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDayChange(member.id, -1)}
                            disabled={days <= 0}
                            className="w-8 h-8 rounded-lg bg-bg-surface flex items-center justify-center text-text-secondary hover:text-text-primary font-bold text-body-md disabled:opacity-30 transition-opacity"
                          >
                            −
                          </button>

                          <div className="flex items-center">
                            <input
                              type="number"
                              min="0"
                              max="365"
                              value={days}
                              onChange={(e) =>
                                handleDirectDayInput(member.id, e.target.value)
                              }
                              className="w-10 text-center font-mono font-bold text-body-md text-text-primary bg-transparent focus:outline-none"
                            />
                            <span className="text-caption text-text-tertiary pr-1 font-medium">
                              d
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDayChange(member.id, 1)}
                            disabled={days >= cycleDays}
                            className="w-8 h-8 rounded-lg bg-bg-surface flex items-center justify-center text-text-secondary hover:text-text-primary font-bold text-body-md disabled:opacity-30 transition-opacity"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || totalCentavos <= 0}
                  className="w-full btn-primary py-3.5 text-body-md font-bold shadow-lg shadow-accent-teal/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Save & Split Bill</span>
                      <span className="font-mono text-body-sm font-normal">
                        ({amountPesos ? `₱${parseFloat(amountPesos).toFixed(2)}` : "₱0.00"})
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

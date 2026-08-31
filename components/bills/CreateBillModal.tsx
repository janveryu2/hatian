"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING, SPLIT_METHOD_LABELS } from "@/lib/utils/constants";
import { pesosToCentavos, formatCentavos } from "@/lib/utils/currency";
import { calculateSplit, type SplitParticipant } from "@/lib/engine/split";
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
      method: "equal" | "percentage" | "custom_amount" | "prorated_by_days";
      members: SplitParticipant[];
      percentages?: Record<string, number>;
      customAmounts?: Record<string, number>;
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
  // Form fields
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    categories[0]?.id || ""
  );
  const [amountPesos, setAmountPesos] = useState("");
  const [paidById, setPaidById] = useState(currentUserId);
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    d.setDate(1); // 1st of current month
    return d.toISOString().split("T")[0];
  });
  const [periodEnd, setPeriodEnd] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0); // last day of current month
    return d.toISOString().split("T")[0];
  });
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7); // 7 days from today
    return d.toISOString().split("T")[0];
  });

  const [splitMethod, setSplitMethod] = useState<
    "equal" | "percentage" | "custom_amount" | "prorated_by_days"
  >("equal");

  // Custom allocation states
  const [percentages, setPercentages] = useState<Record<string, number>>({});
  const [customAmountsPesos, setCustomAmountsPesos] = useState<
    Record<string, string>
  >({});

  // Custom category creation inline
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("📦");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active participants list
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

  const totalCentavos = useMemo(() => {
    const parsed = parseFloat(amountPesos);
    return isNaN(parsed) || parsed <= 0 ? 0 : pesosToCentavos(parsed);
  }, [amountPesos]);

  // Live calculation of shares for preview
  const previewCalculation = useMemo(() => {
    if (totalCentavos <= 0 || activeMembers.length === 0) return null;

    try {
      const customCentavos: Record<string, number> = {};
      Object.entries(customAmountsPesos).forEach(([userId, pesoStr]) => {
        const p = parseFloat(pesoStr);
        if (!isNaN(p) && p >= 0) {
          customCentavos[userId] = pesosToCentavos(p);
        }
      });

      return calculateSplit({
        method: splitMethod,
        totalAmountCentavos: totalCentavos,
        members: activeMembers,
        creatorId: currentUserId,
        percentages,
        customAmounts: customCentavos,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
      });
    } catch {
      return null;
    }
  }, [
    totalCentavos,
    activeMembers,
    splitMethod,
    currentUserId,
    percentages,
    customAmountsPesos,
    periodStart,
    periodEnd,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalCentavos <= 0) {
      setError("Please enter a valid bill amount");
      return;
    }
    if (!selectedCategoryId) {
      setError("Please select a category");
      return;
    }
    if (activeMembers.length === 0) {
      setError("No active roommates found in this dorm");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const customCentavos: Record<string, number> = {};
      Object.entries(customAmountsPesos).forEach(([userId, pesoStr]) => {
        const p = parseFloat(pesoStr);
        if (!isNaN(p) && p >= 0) {
          customCentavos[userId] = pesosToCentavos(p);
        }
      });

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
          method: splitMethod,
          members: activeMembers,
          percentages,
          customAmounts: customCentavos,
        }
      );

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create bill");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim() || !onAddCategory) return;
    try {
      const cat = await onAddCategory(newCatName.trim(), newCatIcon);
      if (cat) {
        setSelectedCategoryId(cat.id);
      }
      setIsAddingCategory(false);
      setNewCatName("");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to add category"
      );
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
            className="relative w-full max-w-lg bg-bg-card border border-border-subtle rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl z-10 max-h-[92vh] overflow-y-auto"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
            }}
          >
            <div className="w-12 h-1.5 bg-border-subtle rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="text-2xl p-2 rounded-2xl bg-accent-teal/10 text-accent-teal">
                  📋
                </span>
                <div>
                  <h2 className="text-heading-3 font-semibold text-text-primary">
                    Add New Bill
                  </h2>
                  <p className="text-body-sm text-text-tertiary">
                    Split with your roommates
                  </p>
                </div>
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

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Category Picker */}
              <div>
                <label className="block text-body-sm font-medium text-text-secondary mb-2">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`px-3 py-2 rounded-xl text-body-sm font-medium flex items-center gap-1.5 transition-all ${
                        selectedCategoryId === cat.id
                          ? "bg-accent-teal text-white shadow-md shadow-accent-teal/20"
                          : "bg-bg-surface text-text-secondary border border-border-subtle hover:border-border-default"
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}

                  {onAddCategory && !isAddingCategory && (
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(true)}
                      className="px-3 py-2 rounded-xl text-body-sm text-accent-teal border border-dashed border-accent-teal/40 hover:bg-accent-teal/10 transition-colors"
                    >
                      + Custom
                    </button>
                  )}
                </div>

                {/* Inline custom category form */}
                {isAddingCategory && (
                  <div className="mt-2 p-3 rounded-xl bg-bg-surface border border-border-subtle flex items-center gap-2">
                    <input
                      type="text"
                      value={newCatIcon}
                      onChange={(e) => setNewCatIcon(e.target.value)}
                      placeholder="Icon"
                      className="w-12 px-2 py-1.5 rounded-lg bg-bg-primary border border-border-subtle text-center text-body-md"
                      maxLength={2}
                    />
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="Category name"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-bg-primary border border-border-subtle text-text-primary text-body-sm"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      className="btn-primary py-1.5 px-3 text-caption"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(false)}
                      className="text-text-tertiary text-caption px-1.5"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Bill Amount */}
              <div>
                <label className="block text-body-sm font-medium text-text-secondary mb-1.5">
                  Total Amount (₱)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-heading-3 font-mono text-text-tertiary">
                    ₱
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amountPesos}
                    onChange={(e) => setAmountPesos(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-bg-surface border border-border-subtle text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-teal focus:ring-1 focus:ring-accent-teal transition-all text-currency-md font-mono font-bold"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Paid By Selector */}
              <div>
                <label className="block text-body-sm font-medium text-text-secondary mb-1.5">
                  Paid By (Who fronted the money?)
                </label>
                <select
                  value={paidById}
                  onChange={(e) => setPaidById(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border-subtle text-text-primary focus:outline-none focus:border-accent-teal transition-all text-body-md"
                >
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profile?.display_name || m.profile?.email || "Roommate"}{" "}
                      {m.user_id === currentUserId ? "(You)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-caption font-medium text-text-secondary mb-1">
                    Period Start
                  </label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-surface border border-border-subtle text-text-primary text-body-sm font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-caption font-medium text-text-secondary mb-1">
                    Period End
                  </label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-surface border border-border-subtle text-text-primary text-body-sm font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-caption font-medium text-text-secondary mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-bg-surface border border-border-subtle text-text-primary text-body-sm font-mono"
                  required
                />
              </div>

              {/* Split Method Tabs */}
              <div>
                <label className="block text-body-sm font-medium text-text-secondary mb-2">
                  Split Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-bg-surface border border-border-subtle">
                  {(
                    [
                      "equal",
                      "percentage",
                      "custom_amount",
                      "prorated_by_days",
                    ] as const
                  ).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSplitMethod(m)}
                      className={`py-2 px-1 text-center rounded-xl text-caption font-semibold transition-all ${
                        splitMethod === m
                          ? "bg-accent-teal text-white shadow-sm"
                          : "text-text-tertiary hover:text-text-primary"
                      }`}
                    >
                      {SPLIT_METHOD_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Percentage / Custom inputs */}
              {splitMethod === "percentage" && (
                <div className="p-3.5 rounded-2xl bg-bg-surface border border-border-subtle space-y-2.5">
                  <p className="text-caption font-medium text-text-secondary">
                    Assign percentages (Total must equal 100%):
                  </p>
                  {activeMembers.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-3 text-body-sm"
                    >
                      <span className="text-text-primary font-medium truncate">
                        {m.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0"
                          value={percentages[m.id] ?? ""}
                          onChange={(e) =>
                            setPercentages({
                              ...percentages,
                              [m.id]: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-20 px-2 py-1 rounded-lg bg-bg-primary border border-border-subtle text-right font-mono text-body-sm"
                        />
                        <span className="text-text-tertiary">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {splitMethod === "custom_amount" && (
                <div className="p-3.5 rounded-2xl bg-bg-surface border border-border-subtle space-y-2.5">
                  <p className="text-caption font-medium text-text-secondary">
                    Assign exact amounts in Pesos (Total must match ₱{amountPesos || "0"}):
                  </p>
                  {activeMembers.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-3 text-body-sm"
                    >
                      <span className="text-text-primary font-medium truncate">
                        {m.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-text-tertiary">₱</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={customAmountsPesos[m.id] ?? ""}
                          onChange={(e) =>
                            setCustomAmountsPesos({
                              ...customAmountsPesos,
                              [m.id]: e.target.value,
                            })
                          }
                          className="w-24 px-2 py-1 rounded-lg bg-bg-primary border border-border-subtle text-right font-mono text-body-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Live Share Breakdown Preview */}
              {previewCalculation && (
                <div className="p-4 rounded-2xl bg-accent-teal/5 border border-accent-teal/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-caption font-semibold text-accent-teal uppercase tracking-wider">
                      Live Share Breakdown
                    </p>
                    <span className="text-caption font-mono text-text-tertiary">
                      {formatCentavos(previewCalculation.totalCentavos)}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {previewCalculation.shares.map((s) => {
                      const member = activeMembers.find(
                        (m) => m.id === s.memberId
                      );
                      const isMe = s.memberId === currentUserId;
                      return (
                        <div
                          key={s.memberId}
                          className="flex items-center justify-between text-body-sm"
                        >
                          <span className="text-text-secondary truncate">
                            {member?.name || "Roommate"}{" "}
                            {isMe ? "(You)" : ""}
                          </span>
                          <span className="font-mono font-semibold text-text-primary">
                            {formatCentavos(s.amountCentavos)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || totalCentavos <= 0}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving Bill...
                    </>
                  ) : (
                    "Save & Split Bill"
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

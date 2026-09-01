"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING } from "@/lib/utils/constants";
import { pesosToCentavos, formatCentavos } from "@/lib/utils/currency";
import { calculateSplit, daysBetween, type SplitParticipant } from "@/lib/engine/split";
import type { BillCategory } from "@/lib/supabase/types";
import type { DormMemberWithProfile } from "@/lib/hooks/useDorm";
import { useTranslation } from "@/lib/context/LanguageContext";

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
  const { t } = useTranslation();
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    categories[0]?.id || ""
  );
  const [amountPesos, setAmountPesos] = useState("");
  const [paidById, setPaidById] = useState(currentUserId);

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

  const cycleDays = useMemo(() => {
    return daysBetween(periodStart, periodEnd);
  }, [periodStart, periodEnd]);

  const [daysPresent, setDaysPresent] = useState<Record<string, number>>({});

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
    const cleanStr = amountPesos.replace(/[^0-9.]/g, "");
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) || parsed <= 0 ? 0 : pesosToCentavos(parsed);
  }, [amountPesos]);

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
            transition={SPRING.sheet}
            className="relative w-full max-w-lg bg-bg-card border border-border-hairline rounded-t-[28px] sm:rounded-3xl p-6 shadow-2xl z-10 max-h-[92vh] overflow-y-auto flex flex-col"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
            }}
          >
            <div className="w-10 h-1 bg-accent-primary-soft rounded-full mx-auto mb-4 sm:hidden opacity-80" />

            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-heading-2 font-bold text-text-primary">
                  {t("bills.createBillTitle")}
                </h2>
                <p className="text-body-sm text-text-tertiary">
                  {t("bills.daysHelperText")}
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
              <div className="mb-4 p-3.5 rounded-xl bg-accent-coral-soft border border-accent-coral/20 text-accent-coral text-body-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 flex-1">
              <div>
                <label className="block text-caption font-semibold uppercase text-text-secondary mb-2">
                  {t("bills.categoryLabel")}
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
                            ? "bg-accent-primary text-white border-accent-primary shadow-md shadow-accent-primary/20"
                            : "bg-bg-surface text-text-secondary border-border-hairline hover:border-accent-primary-border"
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
                      className="px-3 py-2 rounded-xl text-body-sm font-medium border border-dashed border-border-subtle text-text-tertiary hover:text-accent-primary hover:border-accent-primary-border transition-colors"
                    >
                      {t("bills.newCategory")}
                    </button>
                  )}
                </div>

                {isAddingCategory && (
                  <div className="mt-3 p-3 rounded-xl bg-bg-surface border border-border-subtle flex items-center gap-2">
                    <input
                      type="text"
                      value={newCatIcon}
                      onChange={(e) => setNewCatIcon(e.target.value)}
                      placeholder="Icon"
                      className="w-12 text-center text-body-md py-1.5 rounded-lg bg-bg-base border border-border-subtle"
                      maxLength={2}
                    />
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder={t("bills.categoryNamePlaceholder")}
                      className="flex-1 px-3 py-1.5 text-body-sm rounded-lg bg-bg-base border border-border-subtle text-text-primary"
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
                      className="px-3 py-1.5 rounded-lg bg-accent-primary text-white text-caption font-semibold"
                    >
                      {t("common.confirm")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(false)}
                      className="px-2 py-1.5 text-text-tertiary text-caption"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-caption font-semibold uppercase text-text-secondary mb-1.5">
                  {t("bills.billAmountLabel")}
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
                    className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-bg-surface border border-border-hairline text-text-primary font-mono text-heading-3 font-bold placeholder:text-text-tertiary/40 focus:border-accent-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-caption font-semibold uppercase text-text-secondary mb-1">
                    {t("bills.billingPeriodLabel")} (Start)
                  </label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-surface border border-border-hairline text-text-primary font-mono text-body-sm focus:border-accent-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-caption font-semibold uppercase text-text-secondary mb-1">
                    {t("bills.billingPeriodLabel")} (End)
                  </label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-surface border border-border-hairline text-text-primary font-mono text-body-sm focus:border-accent-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-caption font-semibold uppercase text-text-secondary mb-1">
                    {t("bills.frontedByLabel")}
                  </label>
                  <select
                    value={paidById}
                    onChange={(e) => setPaidById(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-surface border border-border-hairline text-text-primary text-body-sm focus:border-accent-primary focus:outline-none"
                  >
                    {activeMembers.map((m) => (
                      <option key={m.id} value={m.id} className="bg-bg-card">
                        {m.name} {m.id === currentUserId ? `(${t("common.you")})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-caption font-semibold uppercase text-text-secondary mb-1">
                    {t("bills.dueDateLabel")}
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-surface border border-border-hairline text-text-primary font-mono text-body-sm focus:border-accent-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <label className="block text-caption font-semibold uppercase text-text-secondary">
                      {t("bills.daysPresentTitle")}
                    </label>
                    <p className="text-caption text-text-tertiary">
                      {t("bills.daysPresentSub")}
                    </p>
                  </div>
                  <span className="text-caption font-mono text-accent-primary bg-accent-primary-soft px-2.5 py-1 rounded-lg font-semibold">
                    {activeMembers.length} {t("common.roommates")}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {activeMembers.map((member) => {
                    const isCreator = member.id === currentUserId;
                    const share = calculation?.shares.find(
                      (s) => s.memberId === member.id
                    );
                    const isPayer = member.id === paidById;

                    return (
                      <div
                        key={member.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                          isCreator
                            ? "bg-bg-surface border-accent-primary-border ring-1 ring-accent-primary/20"
                            : "bg-bg-surface border-border-hairline opacity-90"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-body-md font-semibold text-text-primary truncate flex items-center gap-1.5">
                            {member.name}
                            {isCreator && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-accent-primary-soft text-accent-primary shrink-0">
                                {t("common.you")}
                              </span>
                            )}
                            {isPayer && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-accent-teal-soft text-accent-teal shrink-0">
                                {t("bills.paidStatus")}
                              </span>
                            )}
                          </p>

                          <p className="text-caption text-text-tertiary">
                            {totalCentavos === 0 ? (
                              "(₱0.00)"
                            ) : (
                              <>
                                {share ? formatCentavos(share.amountCentavos) : "₱0.00"}
                                {!isCreator && (
                                  <span className="text-[11px] text-accent-amber ml-1.5">
                                    • {t("bills.pendingEntryNotice")}
                                  </span>
                                )}
                              </>
                            )}
                          </p>
                        </div>

                        {isCreator ? (
                          <div className="flex items-center gap-1.5 bg-bg-card border border-border-hairline rounded-xl p-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDayChange(member.id, -1)}
                              disabled={(effectiveDaysMap[member.id] ?? cycleDays) <= 0}
                              className="w-8 h-8 rounded-lg bg-bg-surface flex items-center justify-center text-text-secondary hover:text-text-primary font-bold text-body-md disabled:opacity-30 transition-opacity"
                            >
                              −
                            </button>

                            <div className="flex items-center">
                              <input
                                type="number"
                                min="0"
                                max="365"
                                value={effectiveDaysMap[member.id] ?? cycleDays}
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
                              disabled={(effectiveDaysMap[member.id] ?? cycleDays) >= cycleDays}
                              className="w-8 h-8 rounded-lg bg-bg-surface flex items-center justify-center text-text-secondary hover:text-text-primary font-bold text-body-md disabled:opacity-30 transition-opacity"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span className="px-3 py-1.5 rounded-xl bg-bg-card border border-border-hairline font-mono text-caption text-text-tertiary shrink-0">
                            {t("bills.pendingEntryBadge")}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || totalCentavos <= 0}
                  className="w-full btn-primary py-3.5 text-body-md font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{t("bills.createBillBtn")}</span>
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

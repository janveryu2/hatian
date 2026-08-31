"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING, STAGGER_DELAY } from "@/lib/utils/constants";
import { formatCentavos } from "@/lib/utils/currency";
import { useAuth } from "@/lib/hooks/useAuth";
import { useDorm } from "@/lib/hooks/useDorm";
import { useBills, type BillWithDetails } from "@/lib/hooks/useBills";
import { CreateBillModal } from "@/components/bills/CreateBillModal";
import { BillDetailModal } from "@/components/bills/BillDetailModal";
import { LoadingSkeletonCard } from "@/components/ui/LoadingSkeleton";
import { useTranslation } from "@/lib/context/LanguageContext";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER_DELAY,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: SPRING.page,
  },
};

export default function BillsPage() {
  const { user } = useAuth();
  const { activeDorm, members, isAdmin } = useDorm();
  const {
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
  } = useBills();
  const { t } = useTranslation();

  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);

  const selectedBill = useMemo(() => {
    if (!selectedBillId) return null;
    return bills.find((b) => b.id === selectedBillId) || null;
  }, [bills, selectedBillId]);

  // Filter bills based on selected tab / category
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (selectedFilter === "all") return true;
      if (selectedFilter === "unsettled") return !b.isFullySettled;
      if (selectedFilter === "settled") return b.isFullySettled;
      return b.category_id === selectedFilter;
    });
  }, [bills, selectedFilter]);

  if (isLoading) {
    return (
      <div
        className="px-5 pt-4 max-w-xl mx-auto space-y-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1.5">
            <div className="w-24 h-7 rounded-lg bg-bg-surface/80 animate-pulse" />
            <div className="w-36 h-4 rounded-md bg-bg-surface/50 animate-pulse" />
          </div>
          <div className="w-24 h-9 rounded-xl bg-bg-surface/80 animate-pulse" />
        </div>
        <LoadingSkeletonCard />
        <LoadingSkeletonCard />
        <LoadingSkeletonCard />
      </div>
    );
  }

  return (
    <motion.div
      className="px-5 pt-4 max-w-xl mx-auto space-y-5"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header & Add Button */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between gap-2"
      >
        <div>
          <h1 className="text-heading-1 font-bold text-text-primary tracking-tight">
            {t("bills.title")}
          </h1>
          <p className="text-body-sm text-text-tertiary">
            {activeDorm ? activeDorm.name : t("bills.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle variant="header" />
          {activeDorm && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="btn-primary py-2.5 px-3.5 text-body-sm flex items-center gap-1.5 shadow-lg shadow-accent-teal/15"
            >
              <span>+</span> {t("bills.addBill")}
            </button>
          )}
        </div>
      </motion.div>

      {error && (
        <div className="p-3.5 rounded-xl bg-accent-terracotta/10 border border-accent-terracotta/20 text-accent-terracotta text-body-sm">
          {error}
        </div>
      )}

      {/* No Dorm Alert */}
      {!activeDorm ? (
        <div className="card p-8 text-center space-y-3">
          <span className="text-4xl block">🏠</span>
          <p className="text-body-md font-semibold text-text-primary">
            {t("settle.noDormTitle")}
          </p>
          <p className="text-body-sm text-text-tertiary max-w-[260px] mx-auto">
            {t("settle.noDormSub")}
          </p>
        </div>
      ) : (
        <>
          {/* Filter Chips Horizontal Scroll */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-none"
          >
            <button
              onClick={() => setSelectedFilter("all")}
              className={`px-3.5 py-1.5 rounded-full text-caption font-semibold shrink-0 transition-all ${
                selectedFilter === "all"
                  ? "bg-text-primary text-bg-primary shadow-sm"
                  : "bg-bg-surface text-text-secondary border border-border-subtle hover:border-border-default"
              }`}
            >
              {t("bills.filterAll")} ({bills.length})
            </button>

            <button
              onClick={() => setSelectedFilter("unsettled")}
              className={`px-3.5 py-1.5 rounded-full text-caption font-semibold shrink-0 transition-all ${
                selectedFilter === "unsettled"
                  ? "bg-accent-terracotta text-white shadow-sm"
                  : "bg-bg-surface text-text-secondary border border-border-subtle hover:border-border-default"
              }`}
            >
              {t("bills.filterUnpaid")} ({bills.filter((b) => !b.isFullySettled).length})
            </button>

            <button
              onClick={() => setSelectedFilter("settled")}
              className={`px-3.5 py-1.5 rounded-full text-caption font-semibold shrink-0 transition-all ${
                selectedFilter === "settled"
                  ? "bg-accent-sage text-white shadow-sm"
                  : "bg-bg-surface text-text-secondary border border-border-subtle hover:border-border-default"
              }`}
            >
              {t("bills.filterPaid")} ({bills.filter((b) => b.isFullySettled).length})
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedFilter(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-caption font-semibold shrink-0 flex items-center gap-1.5 transition-all ${
                  selectedFilter === cat.id
                    ? "bg-accent-teal text-white shadow-sm"
                    : "bg-bg-surface text-text-secondary border border-border-subtle hover:border-border-default"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </motion.div>

          {/* Bills List */}
          {filteredBills.length === 0 ? (
            <motion.div
              variants={itemVariants}
              className="card p-10 flex flex-col items-center text-center"
            >
              <div className="text-4xl mb-3">📋</div>
              <p className="text-heading-3 text-text-primary font-semibold">
                {selectedFilter === "unsettled"
                  ? t("bills.noUnpaidBills")
                  : selectedFilter === "settled"
                  ? t("bills.noSettledBills")
                  : t("bills.noBillsYet")}
              </p>
              <p className="text-body-sm text-text-tertiary mt-1 mb-6 max-w-[260px]">
                {selectedFilter === "unsettled"
                  ? t("bills.noUnpaidSub")
                  : selectedFilter === "settled"
                  ? t("bills.noSettledSub")
                  : t("bills.noBillsSub")}
              </p>
              {selectedFilter === "all" && (
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="btn-primary py-2.5 px-5 text-body-sm"
                >
                  + {t("bills.addBill")}
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div variants={itemVariants} className="space-y-3">
              {filteredBills.map((bill) => {
                const isPayer = bill.paid_by === user?.id;
                const isOverdue =
                  new Date(bill.due_date).getTime() < Date.now() &&
                  !bill.isFullySettled;

                return (
                  <motion.div
                    key={bill.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedBillId(bill.id)}
                    className="card p-4 flex flex-col gap-3 cursor-pointer hover:border-accent-teal/40 transition-colors"
                  >
                    {/* Top row: Category icon, name, cycle, and total amount */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl p-2 rounded-xl bg-accent-teal/10">
                          {bill.category?.icon || "📋"}
                        </span>
                        <div>
                          <p className="text-body-md font-semibold text-text-primary">
                            {bill.category?.name || "Bill"}
                          </p>
                          <p className="text-caption text-text-tertiary">
                            {t("bills.due", { date: bill.due_date })}
                            {isOverdue && (
                              <span className="text-accent-terracotta font-medium ml-1">
                                • {t("bills.overdue")}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-currency-md font-mono font-bold text-text-primary">
                          {formatCentavos(bill.amount_centavos)}
                        </p>
                        <p className="text-caption text-text-tertiary">
                          {t("bills.sharesCount", { count: bill.shares.length })}
                        </p>
                      </div>
                    </div>

                    {/* Bottom row: Payer & User's Share Status */}
                    <div className="pt-2.5 border-t border-border-subtle flex items-center justify-between text-body-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-caption text-text-tertiary flex items-center gap-1.5 truncate">
                          <span>💳</span>
                          <span>
                            {bill.payerProfile?.display_name || t("common.roommate")}
                            {isPayer ? ` (${t("common.you")})` : ""}
                          </span>
                        </span>
                        {bill.isProvisional && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-accent-sand/15 text-accent-sand font-medium shrink-0">
                            {t("bills.waitingOnCount", { count: bill.unconfirmedCount })}
                          </span>
                        )}
                      </div>

                      {/* User Share Pill */}
                      {isPayer ? (
                        <span className="text-caption font-semibold text-accent-teal">
                          {t("bills.youFronted")}
                        </span>
                      ) : bill.userShare ? (
                        <span
                          className={`text-caption font-semibold px-2 py-0.5 rounded-full ${
                            bill.userShare.payment_status === "confirmed"
                              ? "bg-accent-sage/20 text-accent-sage"
                              : bill.userShare.payment_status === "paid"
                              ? "bg-accent-sand/20 text-accent-sand"
                              : bill.userShare.payment_status === "acknowledged"
                              ? "bg-accent-teal/15 text-accent-teal"
                              : "bg-accent-terracotta/15 text-accent-terracotta"
                          }`}
                        >
                          {bill.userShare.payment_status === "confirmed"
                            ? t("bills.paidStatus")
                            : bill.userShare.payment_status === "paid"
                            ? t("bills.pendingStatus")
                            : bill.userShare.payment_status === "acknowledged"
                            ? t("bills.willPayAmount", {
                                amount: formatCentavos(
                                  bill.userShare.amount_owed_centavos
                                ),
                              })
                            : t("bills.youOweAmount", {
                                amount: formatCentavos(
                                  bill.userShare.amount_owed_centavos
                                ),
                              })}
                        </span>
                      ) : (
                        <span className="text-caption text-text-tertiary">
                          {t("bills.notInSplit")}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </>
      )}

      {/* Modals */}
      <CreateBillModal
        isOpen={isCreateOpen}
        categories={categories}
        members={members}
        currentUserId={user?.id || ""}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={createBill}
        onAddCategory={addCategory}
      />

      <BillDetailModal
        isOpen={!!selectedBill}
        bill={selectedBill}
        currentUserId={user?.id || ""}
        isAdmin={isAdmin}
        onClose={() => setSelectedBillId(null)}
        onUpdateDays={updateShareDays}
        onAcknowledge={acknowledgeShare}
        onMarkPaid={markSharePaid}
        onConfirmPaid={confirmSharePaid}
        onDeleteBill={deleteBill}
      />
    </motion.div>
  );
}

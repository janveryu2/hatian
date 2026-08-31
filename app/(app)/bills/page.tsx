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
    markSharePaid,
    confirmSharePaid,
    deleteBill,
    addCategory,
  } = useBills();

  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<BillWithDetails | null>(
    null
  );

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
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-heading-1 font-bold text-text-primary tracking-tight">
            Bills
          </h1>
          <p className="text-body-sm text-text-tertiary">
            {activeDorm ? activeDorm.name : "Track and split dorm expenses"}
          </p>
        </div>

        {activeDorm && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn-primary py-2.5 px-4 text-body-sm flex items-center gap-1.5 shadow-lg shadow-accent-teal/15"
          >
            <span>+</span> Add Bill
          </button>
        )}
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
            No Dorm Selected
          </p>
          <p className="text-body-sm text-text-tertiary max-w-[260px] mx-auto">
            Please create or join a dorm first to manage and split bills.
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
              All ({bills.length})
            </button>

            <button
              onClick={() => setSelectedFilter("unsettled")}
              className={`px-3.5 py-1.5 rounded-full text-caption font-semibold shrink-0 transition-all ${
                selectedFilter === "unsettled"
                  ? "bg-accent-terracotta text-white shadow-sm"
                  : "bg-bg-surface text-text-secondary border border-border-subtle hover:border-border-default"
              }`}
            >
              Unsettled ({bills.filter((b) => !b.isFullySettled).length})
            </button>

            <button
              onClick={() => setSelectedFilter("settled")}
              className={`px-3.5 py-1.5 rounded-full text-caption font-semibold shrink-0 transition-all ${
                selectedFilter === "settled"
                  ? "bg-accent-sage text-white shadow-sm"
                  : "bg-bg-surface text-text-secondary border border-border-subtle hover:border-border-default"
              }`}
            >
              Settled ({bills.filter((b) => b.isFullySettled).length})
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
                No bills found
              </p>
              <p className="text-body-sm text-text-tertiary mt-1 mb-6 max-w-[260px]">
                {selectedFilter !== "all"
                  ? "No bills match the selected filter"
                  : "Add your first bill to start tracking shared expenses"}
              </p>
              {selectedFilter === "all" && (
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="btn-primary py-2.5 px-5 text-body-sm"
                >
                  + Add Bill
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
                    onClick={() => setSelectedBill(bill)}
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
                            Due {bill.due_date}
                            {isOverdue && (
                              <span className="text-accent-terracotta font-medium ml-1">
                                • Overdue
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
                          {bill.shares.length} shares
                        </p>
                      </div>
                    </div>

                    {/* Bottom row: Payer & User's Share Status */}
                    <div className="pt-2.5 border-t border-border-subtle flex items-center justify-between text-body-sm">
                      <span className="text-caption text-text-tertiary flex items-center gap-1.5">
                        <span>💳</span>
                        <span>
                          {bill.payerProfile?.display_name || "Roommate"}
                          {isPayer ? " (You)" : ""}
                        </span>
                      </span>

                      {/* User Share Pill */}
                      {isPayer ? (
                        <span className="text-caption font-semibold text-accent-teal">
                          You fronted this
                        </span>
                      ) : bill.userShare ? (
                        <span
                          className={`text-caption font-semibold px-2 py-0.5 rounded-full ${
                            bill.userShare.payment_status === "confirmed"
                              ? "bg-accent-sage/20 text-accent-sage"
                              : bill.userShare.payment_status === "paid"
                              ? "bg-accent-sand/20 text-accent-sand"
                              : "bg-accent-terracotta/15 text-accent-terracotta"
                          }`}
                        >
                          {bill.userShare.payment_status === "confirmed"
                            ? "Paid ✓"
                            : bill.userShare.payment_status === "paid"
                            ? "Pending"
                            : `You owe ${formatCentavos(
                                bill.userShare.amount_owed_centavos
                              )}`}
                        </span>
                      ) : (
                        <span className="text-caption text-text-tertiary">
                          Not in split
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
        onClose={() => setSelectedBill(null)}
        onMarkPaid={markSharePaid}
        onConfirmPaid={confirmSharePaid}
        onDeleteBill={deleteBill}
      />
    </motion.div>
  );
}

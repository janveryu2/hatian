"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING, SPLIT_METHOD_LABELS } from "@/lib/utils/constants";
import { formatCentavos } from "@/lib/utils/currency";
import type { BillWithDetails } from "@/lib/hooks/useBills";

interface BillDetailModalProps {
  isOpen: boolean;
  bill: BillWithDetails | null;
  currentUserId: string;
  isAdmin: boolean;
  onClose: () => void;
  onMarkPaid: (shareId: string) => Promise<void>;
  onConfirmPaid: (shareId: string) => Promise<void>;
  onDeleteBill: (billId: string) => Promise<void>;
}

export function BillDetailModal({
  isOpen,
  bill,
  currentUserId,
  isAdmin,
  onClose,
  onMarkPaid,
  onConfirmPaid,
  onDeleteBill,
}: BillDetailModalProps) {
  const [processingShareId, setProcessingShareId] = useState<string | null>(
    null
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!bill) return null;

  const isPayer = bill.paid_by === currentUserId;
  const isCreator = bill.created_by === currentUserId;
  const canDelete = isAdmin || isCreator;

  const handleMarkPaid = async (shareId: string) => {
    try {
      setProcessingShareId(shareId);
      setError(null);
      await onMarkPaid(shareId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to mark as paid");
    } finally {
      setProcessingShareId(null);
    }
  };

  const handleConfirmPaid = async (shareId: string) => {
    try {
      setProcessingShareId(shareId);
      setError(null);
      await onConfirmPaid(shareId);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to confirm payment"
      );
    } finally {
      setProcessingShareId(null);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      await onDeleteBill(bill.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete bill");
    } finally {
      setIsDeleting(false);
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
            className="relative w-full max-w-lg bg-bg-card border border-border-subtle rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
            }}
          >
            <div className="w-12 h-1.5 bg-border-subtle rounded-full mx-auto mb-4 sm:hidden" />

            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2.5 rounded-2xl bg-accent-teal/10 text-accent-teal">
                  {bill.category?.icon || "📋"}
                </span>
                <div>
                  <h2 className="text-heading-3 font-semibold text-text-primary">
                    {bill.category?.name || "Bill"}
                  </h2>
                  <p className="text-body-sm text-text-tertiary">
                    {bill.billing_period_start} → {bill.billing_period_end}
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

            {/* Total Amount Card */}
            <div className="p-5 rounded-2xl bg-bg-surface border border-border-subtle mb-5 flex items-center justify-between">
              <div>
                <p className="text-caption text-text-tertiary uppercase tracking-wider mb-0.5">
                  Total Bill Amount
                </p>
                <p className="text-currency-lg font-mono font-bold text-text-primary">
                  {formatCentavos(bill.amount_centavos)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-caption text-text-tertiary block mb-0.5">
                  Split Method
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-accent-teal/15 text-accent-teal text-caption font-semibold">
                  {SPLIT_METHOD_LABELS[bill.split_method] || bill.split_method}
                </span>
              </div>
            </div>

            {/* Payer Info */}
            <div className="p-3.5 rounded-xl bg-bg-surface border border-border-subtle mb-5 flex items-center justify-between text-body-sm">
              <span className="text-text-tertiary">Fronted / Paid By:</span>
              <span className="font-semibold text-text-primary flex items-center gap-1.5">
                <span>💳</span>
                {bill.payerProfile?.display_name ||
                  bill.payerProfile?.email ||
                  "Roommate"}
                {isPayer && (
                  <span className="text-caption text-accent-teal">(You)</span>
                )}
              </span>
            </div>

            {/* Roommate Shares Breakdown */}
            <div className="space-y-3 mb-6">
              <h3 className="text-body-md font-semibold text-text-primary">
                Shares & Payment Status
              </h3>

              <div className="space-y-2.5">
                {bill.shares.map((share) => {
                  const isShareOwner =
                    share.profile?.id === currentUserId;
                  const isShareConfirmed =
                    share.payment_status === "confirmed";
                  const isSharePaid = share.payment_status === "paid";
                  const isBusy = processingShareId === share.id;

                  return (
                    <div
                      key={share.id}
                      className="p-3.5 rounded-2xl bg-bg-surface border border-border-subtle flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-accent-teal/10 flex items-center justify-center text-body-sm font-semibold text-accent-teal uppercase overflow-hidden shrink-0">
                          {share.profile?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={share.profile.avatar_url}
                              alt="avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            (share.userName || "R").charAt(0)
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-body-sm font-semibold text-text-primary truncate">
                            {share.userName} {isShareOwner ? "(You)" : ""}
                          </p>
                          <p className="text-caption font-mono font-bold text-text-secondary">
                            {formatCentavos(share.amount_owed_centavos)}
                          </p>
                        </div>
                      </div>

                      {/* Action / Badge based on 2-step confirmation state */}
                      <div className="shrink-0 flex items-center gap-2">
                        {isShareConfirmed ? (
                          <span className="px-2.5 py-1 rounded-full bg-accent-sage/20 text-accent-sage text-caption font-semibold">
                            ✓ Confirmed
                          </span>
                        ) : isSharePaid ? (
                          isPayer || isAdmin ? (
                            <button
                              type="button"
                              onClick={() => handleConfirmPaid(share.id)}
                              disabled={isBusy}
                              className="btn-primary py-1 px-3 text-caption"
                            >
                              {isBusy ? "..." : "Confirm Received"}
                            </button>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-accent-sand/20 text-accent-sand text-caption font-semibold">
                              Pending Confirmation
                            </span>
                          )
                        ) : isShareOwner ? (
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(share.id)}
                            disabled={isBusy}
                            className="btn-primary py-1 px-3 text-caption"
                          >
                            {isBusy ? "..." : "Mark Paid"}
                          </button>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-accent-terracotta/15 text-accent-terracotta text-caption font-medium">
                            Unpaid
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Delete Bill option for creator/admin */}
            {canDelete && (
              <div className="pt-4 border-t border-border-subtle">
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-2.5 text-body-sm font-medium text-accent-terracotta hover:bg-accent-terracotta/10 rounded-xl transition-colors text-center"
                  >
                    Delete this Bill...
                  </button>
                ) : (
                  <div className="p-4 rounded-2xl bg-accent-terracotta/10 border border-accent-terracotta/30 text-center space-y-2.5">
                    <p className="text-body-sm font-semibold text-text-primary">
                      Delete this bill permanently?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isDeleting}
                        className="flex-1 btn-secondary py-2 text-body-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-1 px-3 py-2 rounded-xl bg-accent-terracotta text-white font-medium text-body-sm"
                      >
                        {isDeleting ? "Deleting..." : "Yes, Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

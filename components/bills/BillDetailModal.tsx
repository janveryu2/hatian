"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING } from "@/lib/utils/constants";
import { formatCentavos } from "@/lib/utils/currency";
import { daysBetween } from "@/lib/engine/split";
import type { BillWithDetails } from "@/lib/hooks/useBills";

interface BillDetailModalProps {
  isOpen: boolean;
  bill: BillWithDetails | null;
  currentUserId: string;
  isAdmin: boolean;
  onClose: () => void;
  onUpdateDays?: (
    billId: string,
    shareId: string,
    newDays: number
  ) => Promise<void>;
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
  onUpdateDays,
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

  const cycleDays = daysBetween(
    bill.billing_period_start,
    bill.billing_period_end
  );

  const isPayer = bill.paid_by === currentUserId;
  const isCreator = bill.created_by === currentUserId;
  const canDelete = isAdmin || isCreator;

  // Current user's personal share
  const myShare = bill.userShare;
  const isMyShareConfirmed = myShare?.payment_status === "confirmed";
  const isMySharePaid = myShare?.payment_status === "paid";

  const handleDayChange = async (shareId: string, currentDays: number, delta: number) => {
    if (!onUpdateDays) return;
    const nextDays = Math.max(0, Math.min(cycleDays, currentDays + delta));
    try {
      setProcessingShareId(shareId);
      setError(null);
      await onUpdateDays(bill.id, shareId, nextDays);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update days");
    } finally {
      setProcessingShareId(null);
    }
  };

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
            className="relative w-full max-w-lg bg-bg-card border border-border-subtle rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl z-10 max-h-[92vh] overflow-y-auto flex flex-col"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
            }}
          >
            <div className="w-12 h-1.5 bg-border-subtle rounded-full mx-auto mb-4 sm:hidden" />

            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2.5 rounded-2xl bg-accent-teal/10 text-accent-teal">
                  {bill.category?.icon || "📋"}
                </span>
                <div>
                  <h2 className="text-heading-2 font-bold text-text-primary">
                    {bill.category?.name || "Bill"}
                  </h2>
                  <p className="text-body-sm text-text-tertiary">
                    {bill.billing_period_start} → {bill.billing_period_end} ({cycleDays} days)
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

            {/* 1. Primary Action Hero Banner for Current User */}
            {!isPayer && myShare && (
              <div
                className={`p-4 rounded-2xl mb-4 border transition-all ${
                  isMyShareConfirmed
                    ? "bg-accent-teal/10 border-accent-teal/30"
                    : isMySharePaid
                    ? "bg-accent-sand/10 border-accent-sand/30"
                    : "bg-accent-coral/10 border-accent-coral/30"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-caption font-semibold uppercase tracking-wider block text-text-secondary">
                      Your Share Owed
                    </span>
                    <p className="text-heading-2 font-mono font-bold text-text-primary">
                      {formatCentavos(myShare.amount_owed_centavos)}
                    </p>
                    <p className="text-caption text-text-tertiary mt-0.5">
                      Based on {myShare.days_present ?? cycleDays} of {cycleDays} days present
                    </p>
                  </div>

                  <div className="shrink-0">
                    {isMyShareConfirmed ? (
                      <span className="px-3.5 py-1.5 rounded-xl bg-accent-teal text-white text-body-sm font-semibold flex items-center gap-1.5 shadow-sm">
                        <span>✓</span> Settled
                      </span>
                    ) : isMySharePaid ? (
                      <span className="px-3.5 py-1.5 rounded-xl bg-accent-sand/20 text-accent-sand text-body-sm font-semibold">
                        Sent • Pending Confirm
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMarkPaid(myShare.id)}
                        disabled={processingShareId === myShare.id}
                        className="btn-primary py-2.5 px-4 text-body-sm font-bold shadow-md shadow-accent-teal/20 flex items-center gap-1.5"
                      >
                        {processingShareId === myShare.id ? (
                          "Updating..."
                        ) : (
                          <>
                            <span>Mark Paid</span>
                            <span>→</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Total Amount & Paid By Info */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3.5 rounded-xl bg-bg-surface border border-border-subtle">
                <span className="text-caption text-text-tertiary uppercase block mb-0.5">
                  Total Bill
                </span>
                <span className="text-heading-3 font-mono font-bold text-text-primary">
                  {formatCentavos(bill.amount_centavos)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-bg-surface border border-border-subtle">
                <span className="text-caption text-text-tertiary uppercase block mb-0.5">
                  Fronted By
                </span>
                <span className="text-body-md font-semibold text-text-primary truncate block">
                  {bill.payerProfile?.display_name ||
                    bill.payerProfile?.email ||
                    "Roommate"}
                  {isPayer && " (You)"}
                </span>
              </div>
            </div>

            {/* Roommate Shares Breakdown with Self-Entry Days Stepper */}
            <div className="space-y-3 mb-6 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-caption font-semibold uppercase text-text-secondary">
                    Roommate Days & Shares ({bill.shares.length})
                  </h3>
                  <p className="text-caption text-text-tertiary">
                    Enter your days present — all shares recalculate live
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {bill.shares.map((share) => {
                  const isShareOwner = share.profile?.id === currentUserId;
                  const isConfirmed = share.payment_status === "confirmed";
                  const isPaid = share.payment_status === "paid";
                  const isBusy = processingShareId === share.id;
                  const days = share.days_present ?? cycleDays;
                  const canEditDays = isShareOwner || isAdmin;

                  return (
                    <div
                      key={share.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-2.5 ${
                        isShareOwner
                          ? "bg-bg-surface border-accent-teal/40 ring-1 ring-accent-teal/20"
                          : "bg-bg-surface border-border-subtle"
                      }`}
                    >
                      {/* Top Row: Name, Share Amount, and Payment Status */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-accent-teal/10 flex items-center justify-center text-caption font-bold text-accent-teal uppercase overflow-hidden shrink-0">
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
                            <p className="text-body-sm font-semibold text-text-primary truncate flex items-center gap-1">
                              {share.userName}
                              {isShareOwner && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-accent-teal/15 text-accent-teal">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-body-sm font-mono font-bold text-text-primary">
                              {formatCentavos(share.amount_owed_centavos)}
                            </p>
                          </div>
                        </div>

                        {/* Payment Status / Action */}
                        <div className="shrink-0">
                          {isConfirmed ? (
                            <span className="px-2.5 py-1 rounded-full bg-accent-teal/15 text-accent-teal text-caption font-semibold">
                              ✓ Confirmed
                            </span>
                          ) : isPaid ? (
                            isPayer || isAdmin ? (
                              <button
                                type="button"
                                onClick={() => handleConfirmPaid(share.id)}
                                disabled={isBusy}
                                className="btn-primary py-1 px-3 text-caption font-semibold shadow-sm"
                              >
                                {isBusy ? "..." : "Confirm Received ✓"}
                              </button>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-accent-sand/20 text-accent-sand text-caption font-medium">
                                Pending Confirm
                              </span>
                            )
                          ) : isShareOwner ? (
                            <button
                              type="button"
                              onClick={() => handleMarkPaid(share.id)}
                              disabled={isBusy}
                              className="btn-primary py-1 px-3 text-caption font-semibold"
                            >
                              {isBusy ? "..." : "Mark Paid"}
                            </button>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-accent-coral/15 text-accent-coral text-caption font-medium">
                              Unpaid
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: Days Stepper (Editable for Owner/Admin, View-Only for Others) */}
                      <div className="pt-2 border-t border-border-subtle/50 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-caption text-text-tertiary">
                            Days Present:
                          </span>
                          {share.is_days_confirmed ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-accent-teal/10 text-accent-teal font-medium">
                              Confirmed
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-bg-card text-text-tertiary font-medium">
                              Default
                            </span>
                          )}
                        </div>

                        {canEditDays ? (
                          <div className="flex items-center gap-1.5 bg-bg-card border border-border-subtle rounded-xl p-0.5">
                            <button
                              type="button"
                              onClick={() => handleDayChange(share.id, days, -1)}
                              disabled={days <= 0 || isBusy}
                              className="w-7 h-7 rounded-lg bg-bg-surface flex items-center justify-center text-text-secondary hover:text-text-primary font-bold text-body-sm disabled:opacity-30 transition-opacity"
                            >
                              −
                            </button>
                            <span className="w-9 text-center font-mono font-bold text-body-sm text-text-primary">
                              {days}d
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDayChange(share.id, days, 1)}
                              disabled={days >= cycleDays || isBusy}
                              className="w-7 h-7 rounded-lg bg-bg-surface flex items-center justify-center text-text-secondary hover:text-text-primary font-bold text-body-sm disabled:opacity-30 transition-opacity"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-bg-card border border-border-subtle font-mono text-caption font-bold text-text-secondary">
                            {days} of {cycleDays} days
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Delete Bill for creator/admin */}
            {canDelete && (
              <div className="pt-3 border-t border-border-subtle">
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-2 text-body-sm font-medium text-accent-terracotta hover:bg-accent-terracotta/10 rounded-xl transition-colors text-center"
                  >
                    Delete this Bill...
                  </button>
                ) : (
                  <div className="p-3.5 rounded-xl bg-accent-terracotta/10 border border-accent-terracotta/30 text-center space-y-2">
                    <p className="text-body-sm font-semibold text-text-primary">
                      Delete this bill permanently?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isDeleting}
                        className="flex-1 btn-secondary py-1.5 text-body-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-accent-terracotta text-white font-medium text-body-sm"
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

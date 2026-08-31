"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING } from "@/lib/utils/constants";
import { formatCentavos } from "@/lib/utils/currency";
import { daysBetween } from "@/lib/engine/split";
import type { BillWithDetails } from "@/lib/hooks/useBills";
import { useTranslation } from "@/lib/context/LanguageContext";

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
  onAcknowledge?: (shareId: string) => Promise<void>;
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
  onAcknowledge,
  onMarkPaid,
  onConfirmPaid,
  onDeleteBill,
}: BillDetailModalProps) {
  const { t } = useTranslation();
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

  const isPayer =
    bill.paid_by === currentUserId ||
    bill.payerProfile?.id === currentUserId;
  const isCreator = bill.created_by === currentUserId;
  const canDelete = isAdmin || isCreator;

  // Current user's personal share (dynamically derived from latest shares array)
  const myShare =
    bill.shares.find((s) => s.profile?.id === currentUserId) || bill.userShare;
  const isMyShareConfirmed = myShare?.payment_status === "confirmed";
  const isMySharePaid = myShare?.payment_status === "paid";
  const isMyShareAcknowledged = myShare?.payment_status === "acknowledged";

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

  const handleAcknowledge = async (shareId: string) => {
    if (!onAcknowledge) return;
    try {
      setProcessingShareId(shareId);
      setError(null);
      await onAcknowledge(shareId);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to record pay later"
      );
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
            transition={SPRING.sheet}
            className="relative w-full max-w-lg bg-bg-card border border-border-primary rounded-t-[28px] sm:rounded-3xl p-6 shadow-2xl z-10 max-h-[92vh] overflow-y-auto flex flex-col"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
            }}
          >
            <div className="w-10 h-1 bg-border-primary rounded-full mx-auto mb-4 sm:hidden opacity-80" />

            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2.5 rounded-2xl bg-accent-teal/10 text-accent-teal">
                  {bill.category?.icon || "📋"}
                </span>
                <div>
                  <h2 className="text-heading-2 font-bold text-text-primary">
                    {bill.category?.name || "Bill"}
                  </h2>
                  <p className="text-body-sm text-text-tertiary">
                    {bill.billing_period_start} → {bill.billing_period_end} ({t("bills.cycleDaysText", { days: cycleDays })})
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

            {/* Provisional vs Finalized Status Banner */}
            {bill.isProvisional ? (
              <div className="mb-4 px-3.5 py-2 rounded-xl bg-accent-sand/15 border border-accent-sand/30 flex items-center gap-2 text-caption text-accent-sand font-medium">
                <span>⏳</span>
                <span>
                  {t("bills.provisionalBanner", {
                    names:
                      bill.unconfirmedNames.length > 0
                        ? bill.unconfirmedNames.join(", ")
                        : t("common.roommates"),
                  })}
                </span>
              </div>
            ) : (
              <div className="mb-4 px-3.5 py-1.5 rounded-xl bg-accent-teal/10 border border-accent-teal/20 flex items-center gap-2 text-caption text-accent-teal font-medium">
                <span>✓</span>
                <span>{t("bills.finalizedBanner")}</span>
              </div>
            )}

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
                    : isMyShareAcknowledged
                    ? "bg-accent-teal/5 border-accent-teal/20"
                    : "bg-accent-coral/10 border-accent-coral/30"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-caption font-semibold uppercase tracking-wider block text-text-secondary">
                      {bill.isProvisional ? t("bills.yourEstimatedShare") : t("bills.yourShareOwed")}
                    </span>
                    <p className="text-heading-2 font-mono font-bold text-text-primary">
                      {formatCentavos(myShare.amount_owed_centavos)}
                    </p>
                    <p className="text-caption text-text-tertiary mt-0.5">
                      {t("bills.basedOnDays", {
                        days: myShare.days_present ?? cycleDays,
                        total: cycleDays,
                      })}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isMyShareConfirmed ? (
                      <span className="px-3.5 py-1.5 rounded-xl bg-accent-teal text-white text-body-sm font-semibold flex items-center gap-1.5 shadow-sm">
                        <span>✓</span> {t("bills.settledBadge")}
                      </span>
                    ) : isMySharePaid ? (
                      <span className="px-3.5 py-1.5 rounded-xl bg-accent-sand/20 text-accent-sand text-body-sm font-semibold">
                        {t("bills.sentPendingConfirm")}
                      </span>
                    ) : isMyShareAcknowledged ? (
                      <div className="flex items-center gap-2">
                        <span className="text-caption px-2.5 py-1 rounded-xl bg-accent-teal/15 text-accent-teal font-semibold">
                          {t("bills.willPayLaterBadge")}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMarkPaid(myShare.id)}
                          disabled={processingShareId === myShare.id}
                          className="btn-primary py-2 px-3 text-caption font-bold shadow-sm"
                        >
                          {t("bills.markPaidButton")} →
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(myShare.id)}
                          disabled={processingShareId === myShare.id}
                          className="px-3 py-2 rounded-xl bg-bg-surface border border-border-subtle text-text-secondary hover:text-text-primary text-caption font-semibold transition-colors"
                        >
                          {t("bills.payLaterButton")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkPaid(myShare.id)}
                          disabled={processingShareId === myShare.id}
                          className="btn-primary py-2 px-3.5 text-body-sm font-bold shadow-md shadow-accent-teal/20 flex items-center gap-1"
                        >
                          {processingShareId === myShare.id ? (
                            t("bills.markingPaid")
                          ) : (
                            <>
                              <span>{t("bills.markPaidButton")}</span>
                              <span>→</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Total Amount & Paid By Info */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3.5 rounded-xl bg-bg-surface border border-border-subtle">
                <span className="text-caption text-text-tertiary uppercase block mb-0.5">
                  {t("bills.totalBill")}
                </span>
                <span className="text-heading-3 font-mono font-bold text-text-primary">
                  {formatCentavos(bill.amount_centavos)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-bg-surface border border-border-subtle">
                <span className="text-caption text-text-tertiary uppercase block mb-0.5">
                  {t("bills.frontedBy")}
                </span>
                <span className="text-body-md font-semibold text-text-primary truncate block">
                  {bill.payerProfile?.display_name ||
                    bill.payerProfile?.email ||
                    t("common.roommate")}
                  {isPayer && ` (${t("common.you")})`}
                </span>
              </div>
            </div>

            {/* Roommate Shares Breakdown with Self-Entry Days Stepper */}
            <div className="space-y-3 mb-6 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-caption font-semibold uppercase text-text-secondary">
                    {t("bills.roommateDaysAndShares", { count: bill.shares.length })}
                  </h3>
                  <p className="text-caption text-text-tertiary">
                    {t("bills.daysHelperText")}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {bill.shares.map((share) => {
                  const isShareOwner = share.profile?.id === currentUserId;
                  const isSharePayer =
                    bill.paid_by === share.profile?.id ||
                    bill.payerProfile?.id === share.profile?.id;
                  const isConfirmed = share.payment_status === "confirmed";
                  const isPaid = share.payment_status === "paid";
                  const isAcknowledged = share.payment_status === "acknowledged";
                  const isBusy = processingShareId === share.id;
                  const days = share.days_present ?? cycleDays;
                  const canEditDays = isShareOwner;

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
                                  {t("common.you")}
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
                          {isSharePayer ? (
                            <span className="px-2.5 py-1 rounded-full bg-accent-teal/15 text-accent-teal text-caption font-semibold">
                              ✓ {t("bills.frontedBy")}
                            </span>
                          ) : isConfirmed ? (
                            <span className="px-2.5 py-1 rounded-full bg-accent-teal/15 text-accent-teal text-caption font-semibold">
                              ✓ {t("bills.settledBadge")}
                            </span>
                          ) : isPaid ? (
                            isPayer || isAdmin ? (
                              <button
                                type="button"
                                onClick={() => handleConfirmPaid(share.id)}
                                disabled={isBusy}
                                className="btn-primary py-1 px-3 text-caption font-semibold shadow-sm"
                              >
                                {isBusy ? "..." : t("bills.confirmReceivedButton")}
                              </button>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-accent-sand/20 text-accent-sand text-caption font-medium">
                                ⏳ {t("settle.pendingConfirmPill")}
                              </span>
                            )
                          ) : isAcknowledged ? (
                            <span className="px-2.5 py-1 rounded-full bg-accent-teal/10 text-accent-teal text-caption font-medium">
                              {t("bills.willPayLaterBadge")}
                            </span>
                          ) : isShareOwner ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleAcknowledge(share.id)}
                                disabled={isBusy}
                                className="px-2 py-1 rounded-lg bg-bg-card border border-border-subtle text-caption text-text-secondary hover:text-text-primary font-medium transition-colors"
                              >
                                {t("bills.payLaterButton")}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkPaid(share.id)}
                                disabled={isBusy}
                                className="btn-primary py-1 px-2.5 text-caption font-semibold"
                              >
                                {isBusy ? "..." : t("bills.markPaidButton")}
                              </button>
                            </div>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-accent-coral/15 text-accent-coral text-caption font-medium">
                              {t("bills.filterUnpaid")}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: Days Stepper (Editable for Owner, View-Only for Others) */}
                      <div className="pt-2 border-t border-border-subtle/50 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-caption text-text-tertiary">
                            {t("bills.daysPresentTitle")}:
                          </span>
                          {share.is_days_confirmed ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-accent-teal/10 text-accent-teal font-medium">
                              {t("bills.confirmedDaysBadge")}
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-accent-sand/15 text-accent-sand font-medium">
                              {t("bills.pendingEntryBadge")}
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
                            {share.is_days_confirmed
                              ? t("bills.daysCount", { days, total: cycleDays })
                              : t("bills.notYetEntered")}
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
                    {t("bills.deleteBill")}
                  </button>
                ) : (
                  <div className="p-3.5 rounded-xl bg-accent-terracotta/10 border border-accent-terracotta/30 text-center space-y-2">
                    <p className="text-body-sm font-semibold text-text-primary">
                      {t("bills.deleteConfirmTitle")}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isDeleting}
                        className="flex-1 btn-secondary py-1.5 text-body-sm"
                      >
                        {t("common.cancel")}
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-accent-terracotta text-white font-medium text-body-sm"
                      >
                        {isDeleting ? t("bills.deletingBtn") : t("bills.deleteConfirmBtn")}
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

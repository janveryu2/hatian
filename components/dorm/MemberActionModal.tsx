"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING } from "@/lib/utils/constants";
import { formatCentavos } from "@/lib/utils/currency";
import type { DormMemberWithProfile } from "@/lib/hooks/useDorm";
import type { EnrichedPayment } from "@/lib/context/SettlementContext";
import { useTranslation } from "@/lib/context/LanguageContext";

interface MemberActionModalProps {
  isOpen: boolean;
  member: DormMemberWithProfile | null;
  currentUserId: string;
  currentMemberId?: string;
  isCurrentUserAdmin?: boolean;
  totalAdmins: number;
  memberBalanceCentavos?: number;
  suggestedDebtCentavos?: number;
  pendingIncomingPayment?: EnrichedPayment | null;
  pendingOutgoingPayment?: EnrichedPayment | null;
  onClose: () => void;
  onOpenRecordPayment?: (memberId: string, suggestedAmountCentavos?: number) => void;
  onConfirmReceipt?: (paymentId: string) => Promise<void>;
  onUpdateRole?: (memberId: string, role: "admin" | "member") => Promise<void>;
  onUpdateStatus?: (
    memberId: string,
    status: "active" | "inactive",
    moveOutDate?: string
  ) => Promise<void>;
  onRemove?: (
    memberId: string,
    strategy?: "redistribute_equally" | "absorb_by_admin" | "keep_on_record"
  ) => Promise<void>;
}

export function MemberActionModal({
  isOpen,
  member,
  currentUserId,
  isCurrentUserAdmin = false,
  totalAdmins,
  memberBalanceCentavos = 0,
  suggestedDebtCentavos = 0,
  pendingIncomingPayment,
  pendingOutgoingPayment,
  onClose,
  onOpenRecordPayment,
  onConfirmReceipt,
  onUpdateRole,
  onUpdateStatus,
  onRemove,
}: MemberActionModalProps) {
  const { t } = useTranslation();
  const [moveOutDate, setMoveOutDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [redistributionStrategy, setRedistributionStrategy] = useState<
    "redistribute_equally" | "absorb_by_admin" | "keep_on_record"
  >("redistribute_equally");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmingReceipt, setIsConfirmingReceipt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!member) return null;

  const isSelf = member.user_id === currentUserId;
  const isSoleAdmin = member.role === "admin" && totalAdmins <= 1;
  const displayName =
    member.profile?.display_name || member.profile?.email || t("common.roommate");

  const handleConfirmReceipt = async (paymentId: string) => {
    if (!onConfirmReceipt) return;
    try {
      setIsConfirmingReceipt(true);
      setError(null);
      await onConfirmReceipt(paymentId);
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to confirm payment"
      );
    } finally {
      setIsConfirmingReceipt(false);
    }
  };

  const handleRoleToggle = async () => {
    if (!onUpdateRole) return;
    if (isSoleAdmin) {
      setError(
        "A dorm must always have at least one Admin. Please promote another roommate before demoting yourself."
      );
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      const newRole = member.role === "admin" ? "member" : "admin";
      await onUpdateRole(member.id, newRole);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update role";
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!onUpdateStatus) return;
    try {
      setIsProcessing(true);
      setError(null);
      const newStatus = member.status === "active" ? "inactive" : "active";
      await onUpdateStatus(
        member.id,
        newStatus,
        newStatus === "inactive" ? moveOutDate : undefined
      );
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update status";
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    if (isSoleAdmin) {
      setError(
        "Cannot remove the only Admin in this dorm. Please promote another member first."
      );
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      await onRemove(member.id, redistributionStrategy);
      setShowRemoveConfirm(false);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove member";
      setError(msg);
    } finally {
      setIsProcessing(false);
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
            className="relative w-full max-w-lg bg-bg-card border border-border-primary rounded-t-[28px] sm:rounded-3xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
            }}
          >
            <div className="w-10 h-1 bg-border-primary rounded-full mx-auto mb-4 sm:hidden opacity-80" />

            {/* Header with Avatar & Details */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-accent-teal/15 border border-accent-teal/30 flex items-center justify-center text-heading-3 font-semibold text-accent-teal uppercase overflow-hidden">
                  {member.profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.profile.avatar_url}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    displayName.charAt(0)
                  )}
                </div>
                <div>
                  <h2 className="text-heading-3 font-semibold text-text-primary flex items-center gap-2">
                    {displayName}
                    {isSelf && (
                      <span className="text-caption px-2 py-0.5 rounded-full bg-accent-teal/15 text-accent-teal">
                        {t("common.you")}
                      </span>
                    )}
                  </h2>
                  <p className="text-body-sm text-text-tertiary">
                    {member.profile?.email || t("common.roommate")}
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

            {/* Meta info tags */}
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              <div className="p-3 rounded-xl bg-bg-surface border border-border-subtle">
                <span className="text-caption text-text-tertiary uppercase block mb-0.5">
                  Role
                </span>
                <span className="text-body-md font-semibold text-text-primary capitalize">
                  {member.role === "admin" ? t("dorm.adminBadge") : t("dorm.memberBadge")} {isSoleAdmin ? "(Sole Admin)" : ""}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-bg-surface border border-border-subtle">
                <span className="text-caption text-text-tertiary uppercase block mb-0.5">
                  Net Balance
                </span>
                <span
                  className="text-body-md font-semibold font-mono tabular-nums"
                  style={{
                    color:
                      memberBalanceCentavos > 0
                        ? "var(--accent-teal)"
                        : memberBalanceCentavos < 0
                        ? "var(--accent-coral)"
                        : "var(--text-tertiary)",
                  }}
                >
                  {memberBalanceCentavos > 0 ? "+" : ""}
                  {formatCentavos(memberBalanceCentavos)}
                </span>
              </div>
            </div>

            {/* Settlement & Payment Actions */}
            {!showRemoveConfirm && (
              <div className="space-y-3 mb-4">
                {/* 1. Pending Incoming Payment from this member needing confirmation */}
                {pendingIncomingPayment && (
                  <div className="p-4 rounded-2xl bg-accent-sand/15 border border-accent-sand/35 space-y-2.5">
                    <div>
                      <span className="text-caption font-semibold uppercase text-accent-sand block mb-1">
                        🔔 {t("settle.pendingIncomingTitle", { count: 1 })}
                      </span>
                      <p className="text-body-md font-bold text-text-primary">
                        {t("dorm.roommateSentPayment", {
                          name: displayName,
                          amount: formatCentavos(pendingIncomingPayment.amount_centavos),
                        })}
                      </p>
                      {pendingIncomingPayment.note && (
                        <p className="text-caption text-text-tertiary mt-0.5">
                          Note: {pendingIncomingPayment.note}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleConfirmReceipt(pendingIncomingPayment.id)}
                      disabled={isConfirmingReceipt}
                      className="w-full btn-primary py-2.5 text-body-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-accent-teal/20"
                    >
                      {isConfirmingReceipt ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          {t("settle.confirmingBtn")}
                        </>
                      ) : (
                        t("settle.confirmReceiptBtn")
                      )}
                    </button>
                  </div>
                )}

                {/* 2. Pending Outgoing Payment to this member waiting on their confirmation */}
                {pendingOutgoingPayment && (
                  <div className="p-4 rounded-2xl bg-accent-sand/10 border border-accent-sand/25 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-body-sm font-medium text-text-primary">
                        {t("dorm.sentPendingRoommate", {
                          name: displayName,
                          amount: formatCentavos(pendingOutgoingPayment.amount_centavos),
                        })}
                      </p>
                      {pendingOutgoingPayment.note && (
                        <p className="text-caption text-text-tertiary">
                          Note: {pendingOutgoingPayment.note}
                        </p>
                      )}
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-accent-sand/20 text-accent-sand text-caption font-semibold shrink-0">
                      ⏳ {t("settle.pendingConfirmPill")}
                    </span>
                  </div>
                )}

                {/* 3. Record Payment Button to Settle With this Member */}
                {!isSelf && onOpenRecordPayment && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenRecordPayment(
                        member.id,
                        suggestedDebtCentavos > 0 ? suggestedDebtCentavos : undefined
                      )
                    }
                    className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-accent-teal/15 font-semibold text-body-md"
                  >
                    <span>💸</span>
                    <span>
                      {suggestedDebtCentavos > 0
                        ? t("dorm.payRoommateBtn", {
                            name: displayName,
                            amount: formatCentavos(suggestedDebtCentavos),
                          })
                        : t("dorm.recordPaymentWith", { name: displayName })}
                    </span>
                  </button>
                )}
              </div>
            )}

            {!showRemoveConfirm ? (
              isCurrentUserAdmin && (
                <div className="space-y-3 pt-3 border-t border-border-subtle">
                  <span className="text-caption font-semibold uppercase text-text-tertiary block mb-1">
                    Admin Controls
                  </span>
                  {/* Change Role Button */}
                  <button
                    type="button"
                    onClick={handleRoleToggle}
                    disabled={isProcessing || isSoleAdmin}
                    className="w-full p-4 rounded-2xl bg-bg-surface border border-border-subtle hover:border-accent-teal/50 transition-colors flex items-center justify-between text-left disabled:opacity-50"
                  >
                    <div>
                      <p className="text-body-md font-medium text-text-primary">
                        {member.role === "admin"
                          ? "Demote to Member"
                          : "Promote to Admin"}
                      </p>
                      <p className="text-caption text-text-tertiary">
                        {isSoleAdmin
                          ? "Cannot demote sole admin (dorm must have ≥1 admin)"
                          : member.role === "admin"
                          ? "Revoke administrative privileges for this dorm"
                          : "Allow managing bills, categories, and roommates"}
                      </p>
                    </div>
                    <span className="text-heading-3">
                      {member.role === "admin" ? "🛡️" : "⭐"}
                    </span>
                  </button>

                  {/* Move Out / Inactive Status */}
                  <div className="p-4 rounded-2xl bg-bg-surface border border-border-subtle space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-body-md font-medium text-text-primary">
                          {member.status === "active"
                            ? "Mark as Moved Out"
                            : "Reactivate Member"}
                        </p>
                        <p className="text-caption text-text-tertiary">
                          {member.status === "active"
                            ? "Exclude from future bill cycles after move-out date"
                            : "Include in upcoming bill splits again"}
                        </p>
                      </div>
                      <span className="text-heading-3">
                        {member.status === "active" ? "🚪" : "👋"}
                      </span>
                    </div>

                    {member.status === "active" && (
                      <div>
                        <label className="block text-caption font-medium text-text-secondary mb-1">
                          Move-Out Date
                        </label>
                        <input
                          type="date"
                          value={moveOutDate}
                          onChange={(e) => setMoveOutDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border-subtle text-text-primary font-mono text-body-sm"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleStatusToggle}
                      disabled={isProcessing}
                      className="w-full btn-secondary py-2.5 text-body-sm"
                    >
                      {member.status === "active"
                        ? "Confirm Move Out"
                        : "Reactivate Member"}
                    </button>
                  </div>

                  {/* Remove Member Trigger */}
                  {!isSelf && (
                    <button
                      type="button"
                      onClick={() => setShowRemoveConfirm(true)}
                      disabled={isSoleAdmin}
                      className="w-full p-3 text-accent-terracotta text-body-sm font-medium hover:bg-accent-terracotta/10 rounded-xl transition-colors text-center disabled:opacity-40"
                    >
                      Remove from Dorm...
                    </button>
                  )}
                </div>
              )
            ) : (
              /* Remove Member Confirmation & Debt Redistribution View */
              <div className="p-5 rounded-2xl bg-accent-terracotta/10 border border-accent-terracotta/30 space-y-4">
                <div className="text-center space-y-1">
                  <span className="text-3xl block">⚠️</span>
                  <p className="text-body-md font-semibold text-text-primary">
                    Remove {displayName}?
                  </p>
                  <p className="text-caption text-text-tertiary max-w-[280px] mx-auto">
                    They will lose access to this dorm immediately.
                  </p>
                </div>

                {/* Active balance redistribution options */}
                {memberBalanceCentavos !== 0 && (
                  <div className="p-3.5 rounded-xl bg-bg-card border border-border-subtle text-left space-y-2.5">
                    <p className="text-caption font-semibold text-text-primary">
                      Unsettled Balance:{" "}
                      <span className="font-mono font-bold text-accent-terracotta">
                        {formatCentavos(memberBalanceCentavos)}
                      </span>
                    </p>
                    <p className="text-caption text-text-tertiary">
                      Choose how to handle their remaining balance in the dorm ledger:
                    </p>

                    <div className="space-y-2 pt-1 text-body-sm">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="redistribute"
                          checked={redistributionStrategy === "redistribute_equally"}
                          onChange={() =>
                            setRedistributionStrategy("redistribute_equally")
                          }
                          className="mt-1"
                        />
                        <div>
                          <span className="font-medium text-text-primary block">
                            Redistribute equally among roommates
                          </span>
                          <span className="text-caption text-text-tertiary">
                            Remaining roommates evenly absorb the share
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="redistribute"
                          checked={redistributionStrategy === "absorb_by_admin"}
                          onChange={() =>
                            setRedistributionStrategy("absorb_by_admin")
                          }
                          className="mt-1"
                        />
                        <div>
                          <span className="font-medium text-text-primary block">
                            Absorb debt as Admin
                          </span>
                          <span className="text-caption text-text-tertiary">
                            You assume the balance directly
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="redistribute"
                          checked={redistributionStrategy === "keep_on_record"}
                          onChange={() =>
                            setRedistributionStrategy("keep_on_record")
                          }
                          className="mt-1"
                        />
                        <div>
                          <span className="font-medium text-text-primary block">
                            Keep on record as historical debt
                          </span>
                          <span className="text-caption text-text-tertiary">
                            Unchanged historical record
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRemoveConfirm(false)}
                    disabled={isProcessing}
                    className="flex-1 btn-secondary py-2.5"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-accent-terracotta text-white font-medium text-body-sm hover:opacity-90 transition-opacity"
                  >
                    {isProcessing ? "Removing..." : "Confirm Removal"}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

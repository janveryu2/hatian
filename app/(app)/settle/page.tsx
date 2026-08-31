"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING, STAGGER_DELAY } from "@/lib/utils/constants";
import { formatCentavos } from "@/lib/utils/currency";
import { useAuth } from "@/lib/hooks/useAuth";
import { useDorm } from "@/lib/hooks/useDorm";
import { useSettlement } from "@/lib/hooks/useSettlement";
import { RecordPaymentModal } from "@/components/settle/RecordPaymentModal";
import { LoadingSkeletonHero, LoadingSkeletonCard } from "@/components/ui/LoadingSkeleton";
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

export default function SettlePage() {
  const { user } = useAuth();
  const { activeDorm, members } = useDorm();
  const {
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
  } = useSettlement();
  const { t } = useTranslation();

  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [selectedPayeeId, setSelectedPayeeId] = useState<string>("");
  const [selectedPayeeAmountPesos, setSelectedPayeeAmountPesos] =
    useState<string>("");
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<string | null>(
    null
  );

  const memberMap = new Map(members.map((m) => [m.id, m]));

  // Payments pending confirmation by CURRENT user (where current user is receiver)
  const pendingIncomingPayments = payments.filter(
    (p) => p.to_member === myMemberId && p.status === "pending"
  );

  // Outgoing payments made by CURRENT user waiting for roommate confirmation
  const pendingOutgoingPayments = payments.filter(
    (p) => p.from_member === myMemberId && p.status === "pending"
  );

  const handleOpenSettleDebt = (toMemberId: string, amountCentavos: number) => {
    setSelectedPayeeId(toMemberId);
    setSelectedPayeeAmountPesos((amountCentavos / 100).toFixed(2));
    setIsRecordOpen(true);
  };

  const handleConfirmReceipt = async (paymentId: string) => {
    try {
      setConfirmingPaymentId(paymentId);
      await confirmPayment(paymentId);
    } catch (err: unknown) {
      alert(
        err instanceof Error ? err.message : "Failed to confirm payment"
      );
    } finally {
      setConfirmingPaymentId(null);
    }
  };

  if (isLoading) {
    return (
      <div
        className="px-5 pt-4 max-w-xl mx-auto space-y-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="space-y-1.5">
            <div className="w-28 h-7 rounded-lg bg-bg-surface/80 animate-pulse" />
            <div className="w-44 h-4 rounded-md bg-bg-surface/50 animate-pulse" />
          </div>
          <div className="w-28 h-9 rounded-xl bg-bg-surface/80 animate-pulse" />
        </div>
        <LoadingSkeletonHero />
        <LoadingSkeletonCard />
        <LoadingSkeletonCard />
      </div>
    );
  }

  const isOwed = myNetBalance > 0;
  const owes = myNetBalance < 0;
  const isSettled = myNetBalance === 0;

  return (
    <motion.div
      className="px-5 pt-4 max-w-xl mx-auto space-y-6"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Top Header */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between gap-2"
      >
        <div>
          <h1 className="text-heading-1 font-bold text-text-primary tracking-tight">
            {t("settle.title")}
          </h1>
          <p className="text-body-sm text-text-tertiary">
            {activeDorm
              ? t("settle.subtitle", { dorm: activeDorm.name })
              : t("settle.noDormSub")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle variant="header" />
          {activeDorm && (
            <button
              onClick={() => {
                setSelectedPayeeId("");
                setSelectedPayeeAmountPesos("");
                setIsRecordOpen(true);
              }}
              className="btn-primary py-2.5 px-3.5 text-body-sm flex items-center gap-1.5 shadow-lg shadow-accent-teal/15"
            >
              <span>💸</span> {t("settle.recordPaymentBtn")}
            </button>
          )}
        </div>
      </motion.div>

      {error && (
        <div className="p-3.5 rounded-xl bg-accent-terracotta/10 border border-accent-terracotta/20 text-accent-terracotta text-body-sm">
          {error}
        </div>
      )}

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
          {/* Net Balance Hero Card */}
          <motion.div
            variants={itemVariants}
            className={`card p-6 border-l-4 relative overflow-hidden ${
              isOwed
                ? "border-l-accent-teal"
                : owes
                ? "border-l-accent-coral"
                : "border-l-accent-sage"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-caption text-text-tertiary uppercase tracking-wider mb-1">
                  {t("settle.yourNetBalance")}
                </p>
                <p
                  className="text-heading-1 font-mono font-bold tracking-tight"
                  style={{
                    color: isOwed
                      ? "var(--accent-teal)"
                      : owes
                      ? "var(--accent-coral)"
                      : "var(--accent-sage)",
                  }}
                >
                  {isOwed ? "+" : owes ? "− " : ""}
                  {formatCentavos(Math.abs(myNetBalance))}
                </p>
                <p className="text-body-sm text-text-secondary mt-1">
                  {isOwed
                    ? `🎉 ${t("settle.roommatesOweYou")}`
                    : owes
                    ? `⚠️ ${t("settle.youHaveDebts")}`
                    : `✨ ${t("settle.completelySettled")}`}
                </p>
              </div>

              <div className="text-3xl p-3 rounded-2xl bg-bg-surface">
                {isOwed ? "💰" : owes ? "📉" : "🤝"}
              </div>
            </div>
          </motion.div>

          {/* Pending Confirmations Alert */}
          {pendingIncomingPayments.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="p-4 rounded-2xl bg-accent-sand/15 border border-accent-sand/30 space-y-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">🔔</span>
                <p className="text-body-sm font-semibold text-text-primary">
                  {t("settle.pendingIncomingTitle", { count: pendingIncomingPayments.length })}
                </p>
              </div>

              <div className="space-y-2">
                {pendingIncomingPayments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-bg-card border border-border-subtle flex items-center justify-between gap-3 text-body-sm"
                  >
                    <div>
                      <p className="font-medium text-text-primary">
                        {t("settle.pendingIncomingSub", {
                          name: p.fromName,
                          amount: formatCentavos(p.amount_centavos),
                        })}
                      </p>
                      {p.note && (
                        <p className="text-caption text-text-tertiary">
                          Note: {p.note}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleConfirmReceipt(p.id)}
                      disabled={confirmingPaymentId === p.id}
                      className="btn-primary py-1.5 px-3 text-caption shrink-0"
                    >
                      {confirmingPaymentId === p.id
                        ? t("settle.confirmingBtn")
                        : t("settle.confirmReceiptBtn")}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Outgoing Pending Confirmations Alert */}
          {pendingOutgoingPayments.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="p-4 rounded-2xl bg-accent-sand/10 border border-accent-sand/25 space-y-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">⏳</span>
                <p className="text-body-sm font-semibold text-text-primary">
                  {t("settle.pendingOutgoingTitle", { count: pendingOutgoingPayments.length })}
                </p>
              </div>

              <div className="space-y-2">
                {pendingOutgoingPayments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-bg-card border border-border-subtle flex items-center justify-between gap-3 text-body-sm"
                  >
                    <div>
                      <p className="font-medium text-text-primary">
                        {t("settle.youPay", { name: p.toName })} ({formatCentavos(p.amount_centavos)})
                      </p>
                      {p.note && (
                        <p className="text-caption text-text-tertiary">
                          Note: {p.note}
                        </p>
                      )}
                    </div>
                    <span className="text-caption px-2.5 py-1 rounded-full bg-accent-sand/20 text-accent-sand font-medium shrink-0">
                      {t("settle.waitingOnRoommate", { name: p.toName })}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Simplified Debt Settle-Up Recommendations */}
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-heading-3 font-semibold text-text-primary">
                {t("settle.smartSettlePlan")}
              </h2>
              <span className="text-caption px-2 py-0.5 rounded-full bg-accent-teal/15 text-accent-teal font-medium">
                {t("settle.paymentsNeeded", {
                  count: simplifiedPlan.length,
                  word: simplifiedPlan.length === 1 ? "Bayaran" : "Bayaran",
                })}
              </span>
            </div>

            {simplifiedPlan.length === 0 ? (
              <div className="card p-6 text-center text-text-tertiary text-body-sm">
                🤝 {t("settle.noDebtsToSettle")}
              </div>
            ) : (
              <div className="space-y-2.5">
                {simplifiedPlan.map((planItem, idx) => {
                  const fromMem = memberMap.get(planItem.fromMember);
                  const toMem = memberMap.get(planItem.toMember);

                  const isMeSender = planItem.fromMember === myMemberId;
                  const isMeReceiver = planItem.toMember === myMemberId;

                  const fromName = isMeSender
                    ? t("common.you")
                    : fromMem?.profile?.display_name || t("common.roommate");
                  const toName = isMeReceiver
                    ? t("common.you")
                    : toMem?.profile?.display_name || t("common.roommate");

                  const pendingOutgoing = isMeSender
                    ? pendingOutgoingPayments.find(
                        (p) => p.to_member === planItem.toMember
                      )
                    : null;

                  return (
                    <div
                      key={idx}
                      className={`card p-4 flex items-center justify-between gap-3 ${
                        isMeSender
                          ? "border-accent-terracotta/40 bg-accent-terracotta/5"
                          : isMeReceiver
                          ? "border-accent-teal/40 bg-accent-teal/5"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl shrink-0">
                          {isMeSender ? "📤" : isMeReceiver ? "📥" : "➡️"}
                        </span>
                        <div className="min-w-0">
                          <p className="text-body-md font-semibold text-text-primary truncate">
                            {isMeSender ? (
                              <span className="text-accent-coral">
                                {t("settle.youPay", { name: toName })}
                              </span>
                            ) : (
                              <span>
                                {t("settle.someonePays", {
                                  from: fromName,
                                  to: toName,
                                })}
                              </span>
                            )}
                          </p>
                          <p className="text-currency-md font-mono font-bold text-text-primary">
                            {formatCentavos(planItem.amountCentavos)}
                          </p>
                        </div>
                      </div>

                      {/* Pay CTA or Pending Confirmation badge if current user is the debtor */}
                      {isMeSender && (
                        pendingOutgoing ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-sand/15 border border-accent-sand/30 text-accent-sand text-caption font-semibold shrink-0">
                            <span>⏳</span>
                            <span>{t("settle.pendingConfirmPill")}</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenSettleDebt(
                                planItem.toMember,
                                planItem.amountCentavos
                              )
                            }
                            className="btn-primary py-2 px-3.5 text-caption font-semibold shrink-0 shadow-md shadow-accent-teal/20"
                          >
                            {t("settle.payNowBtn")}
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Roommate Net Balances Table */}
          <motion.div variants={itemVariants} className="space-y-3">
            <h2 className="text-heading-3 font-semibold text-text-primary">
              {t("settle.allBalancesTitle")}
            </h2>

            <div className="card p-2 divide-y divide-border-subtle">
              {members.map((m) => {
                const bal = netBalances.get(m.id) || 0;
                const isMe = m.id === myMemberId;
                const name =
                  m.profile?.display_name || m.profile?.email || t("common.roommate");

                return (
                  <div
                    key={m.id}
                    className="p-3 flex items-center justify-between text-body-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-accent-teal/15 flex items-center justify-center font-semibold text-caption text-accent-teal uppercase overflow-hidden">
                        {m.profile?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.profile.avatar_url}
                            alt={name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          name.charAt(0)
                        )}
                      </div>
                      <span className="font-medium text-text-primary">
                        {name} {isMe ? `(${t("common.you")})` : ""}
                      </span>
                    </div>

                    <span
                      className="font-mono font-bold"
                      style={{
                        color:
                          bal > 0
                            ? "var(--accent-teal)"
                            : bal < 0
                            ? "var(--accent-coral)"
                            : "var(--text-tertiary)",
                      }}
                    >
                      {bal > 0 ? "+" : ""}
                      {formatCentavos(bal)}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Payment History */}
          <motion.div variants={itemVariants} className="space-y-3">
            <h2 className="text-heading-3 font-semibold text-text-primary">
              Payment History
            </h2>

            {payments.length === 0 ? (
              <div className="card p-6 text-center text-text-tertiary text-body-sm">
                No past settlement payments recorded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((pay) => (
                  <div
                    key={pay.id}
                    className="card p-3.5 flex items-center justify-between gap-3 text-body-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary truncate">
                        {pay.fromName} → {pay.toName}
                      </p>
                      <p className="text-caption text-text-tertiary">
                        {new Date(pay.created_at).toLocaleDateString()}
                        {pay.note ? ` • "${pay.note}"` : ""}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-mono font-bold text-text-primary">
                        {formatCentavos(pay.amount_centavos)}
                      </p>
                      <span
                        className={`text-caption font-semibold px-2 py-0.2 rounded-full ${
                          pay.status === "confirmed"
                            ? "bg-accent-sage/20 text-accent-sage"
                            : "bg-accent-sand/20 text-accent-sand"
                        }`}
                      >
                        {pay.status === "confirmed" ? "Confirmed ✓" : "Pending"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* Record Payment Modal */}
      {myMemberId && (
        <RecordPaymentModal
          isOpen={isRecordOpen}
          members={members}
          currentMemberId={myMemberId}
          defaultRecipientId={selectedPayeeId}
          defaultAmountPesos={selectedPayeeAmountPesos}
          onClose={() => {
            setIsRecordOpen(false);
            setSelectedPayeeId("");
            setSelectedPayeeAmountPesos("");
          }}
          onSubmit={async (toMem, amount, note) => {
            await recordPayment(toMem, amount, note);
          }}
        />
      )}
    </motion.div>
  );
}

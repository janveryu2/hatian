"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING } from "@/lib/utils/constants";
import { pesosToCentavos } from "@/lib/utils/currency";
import type { DormMemberWithProfile } from "@/lib/hooks/useDorm";
import { useTranslation } from "@/lib/context/LanguageContext";

interface RecordPaymentModalProps {
  isOpen: boolean;
  members: DormMemberWithProfile[];
  currentMemberId: string;
  defaultRecipientId?: string;
  defaultAmountPesos?: string;
  onClose: () => void;
  onSubmit: (
    toMemberId: string,
    amountCentavos: number,
    note?: string
  ) => Promise<void>;
}

export function RecordPaymentModal({
  isOpen,
  members,
  currentMemberId,
  defaultRecipientId = "",
  defaultAmountPesos = "",
  onClose,
  onSubmit,
}: RecordPaymentModalProps) {
  const { t } = useTranslation();
  const eligibleRecipients = members.filter((m) => m.id !== currentMemberId);

  const [toMemberId, setToMemberId] = useState(
    defaultRecipientId || eligibleRecipients[0]?.id || ""
  );
  const [amountPesos, setAmountPesos] = useState(defaultAmountPesos);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultRecipientId) setToMemberId(defaultRecipientId);
    if (defaultAmountPesos) setAmountPesos(defaultAmountPesos);
  }, [defaultRecipientId, defaultAmountPesos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(amountPesos);
    if (isNaN(p) || p <= 0) {
      setError("Please enter a valid payment amount");
      return;
    }
    if (!toMemberId) {
      setError("Please select a recipient");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(toMemberId, pesosToCentavos(p), note);
      setAmountPesos("");
      setNote("");
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to record payment"
      );
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
            className="relative w-full max-w-lg bg-bg-card border border-border-subtle rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
            }}
          >
            <div className="w-12 h-1.5 bg-border-subtle rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="text-2xl p-2 rounded-2xl bg-accent-sage/15 text-accent-sage">
                  💸
                </span>
                <div>
                  <h2 className="text-heading-3 font-semibold text-text-primary">
                    {t("settle.recordModalTitle")}
                  </h2>
                  <p className="text-body-sm text-text-tertiary">
                    {t("settle.recordModalSub")}
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-body-sm font-medium text-text-secondary mb-1.5">
                  {t("settle.recipientLabel")}
                </label>
                <select
                  value={toMemberId}
                  onChange={(e) => setToMemberId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border-subtle text-text-primary focus:outline-none focus:border-accent-teal transition-all text-body-md"
                  required
                >
                  {eligibleRecipients.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.profile?.display_name ||
                        m.profile?.email ||
                        t("common.roommate")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-body-sm font-medium text-text-secondary mb-1.5">
                  {t("settle.amountLabel")}
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
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-bg-surface border border-border-subtle text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-teal transition-all text-currency-md font-mono font-bold"
                    required
                    autoFocus
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-body-sm font-medium text-text-secondary mb-1.5">
                  {t("settle.noteLabel")}
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("settle.notePlaceholder")}
                  className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border-subtle text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-teal transition-all text-body-md"
                  disabled={isSubmitting}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 btn-secondary"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !amountPesos}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t("settle.sendingPaymentBtn")}
                    </>
                  ) : (
                    t("settle.sendPaymentBtn")
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

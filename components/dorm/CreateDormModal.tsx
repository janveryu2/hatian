"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING } from "@/lib/utils/constants";
import { useTranslation } from "@/lib/context/LanguageContext";

interface CreateDormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, moveInDate: string) => Promise<void>;
}

export function CreateDormModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateDormModalProps) {
  const { t } = useTranslation();
  const [dormName, setDormName] = useState("");
  const [moveInDate, setMoveInDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dormName.trim()) {
      setError("Please enter a name for your dorm");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(dormName.trim(), moveInDate);
      setDormName("");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create dorm";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Card / Bottom Sheet */}
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
            {/* Sheet pull bar (mobile) */}
            <div className="w-12 h-1.5 bg-border-subtle rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="text-2xl p-2 rounded-2xl bg-accent-teal/10 text-accent-teal">
                  🏠
                </span>
                <div>
                  <h2 className="text-heading-3 font-semibold text-text-primary">
                    {t("dorm.createDormBtn")}
                  </h2>
                  <p className="text-body-sm text-text-tertiary">
                    {t("dorm.subtitle")}
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
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3.5 rounded-xl bg-accent-terracotta/10 border border-accent-terracotta/20 text-accent-terracotta text-body-sm"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-body-sm font-medium text-text-secondary mb-1.5">
                  Dorm Name
                </label>
                <input
                  type="text"
                  value={dormName}
                  onChange={(e) => setDormName(e.target.value)}
                  placeholder="e.g. Katipunan Pad 402, BGC Unit 12B"
                  className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border-subtle text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-teal focus:ring-1 focus:ring-accent-teal transition-all text-body-md"
                  autoFocus
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-body-sm font-medium text-text-secondary mb-1.5">
                  Your Move-in Date
                </label>
                <input
                  type="date"
                  value={moveInDate}
                  onChange={(e) => setMoveInDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border-subtle text-text-primary focus:outline-none focus:border-accent-teal focus:ring-1 focus:ring-accent-teal transition-all text-body-md font-mono"
                  disabled={isSubmitting}
                />
                <p className="text-caption text-text-tertiary mt-1">
                  Used for calculating fair bill shares if you moved in mid-cycle
                </p>
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
                  disabled={isSubmitting}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    t("dorm.createDormBtn")
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

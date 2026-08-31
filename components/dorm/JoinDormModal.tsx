"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING } from "@/lib/utils/constants";
import { normalizeInviteCode, formatDisplayCode } from "@/lib/utils/invite";
import type { Dorm, DormInvite } from "@/lib/supabase/types";

interface JoinDormModalProps {
  isOpen: boolean;
  initialCode?: string;
  onClose: () => void;
  onValidate: (code: string) => Promise<{
    valid: boolean;
    dorm?: Dorm;
    invite?: DormInvite;
    error?: string;
  }>;
  onJoin: (code: string, moveInDate: string) => Promise<void>;
}

export function JoinDormModal({
  isOpen,
  initialCode = "",
  onClose,
  onValidate,
  onJoin,
}: JoinDormModalProps) {
  const [rawCode, setRawCode] = useState(initialCode);
  const [moveInDate, setMoveInDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isValidating, setIsValidating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [previewDorm, setPreviewDorm] = useState<Dorm | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync initialCode if passed from URL query
  useEffect(() => {
    if (initialCode) {
      setRawCode(initialCode);
      checkCode(initialCode);
    }
  }, [initialCode]);

  const checkCode = async (codeToTest: string) => {
    const clean = normalizeInviteCode(codeToTest);
    if (clean.length < 6) {
      setPreviewDorm(null);
      return;
    }

    try {
      setIsValidating(true);
      setError(null);
      const res = await onValidate(clean);
      if (res.valid && res.dorm) {
        setPreviewDorm(res.dorm);
      } else {
        setPreviewDorm(null);
        setError(res.error || "Invalid invite code");
      }
    } catch {
      setError("Failed to validate invite code");
    } finally {
      setIsValidating(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setRawCode(val);
    const clean = normalizeInviteCode(val);
    if (clean.length === 6) {
      checkCode(clean);
    } else {
      setPreviewDorm(null);
      if (error) setError(null);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizeInviteCode(rawCode);
    if (!clean || clean.length < 6) {
      setError("Please enter a valid 6-character invite code");
      return;
    }

    try {
      setIsJoining(true);
      setError(null);
      await onJoin(clean, moveInDate);
      setRawCode("");
      setPreviewDorm(null);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to join dorm";
      setError(msg);
    } finally {
      setIsJoining(false);
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
                <span className="text-2xl p-2 rounded-2xl bg-accent-sand/15 text-accent-sand">
                  🔑
                </span>
                <div>
                  <h2 className="text-heading-3 font-semibold text-text-primary">
                    Join a Dorm
                  </h2>
                  <p className="text-body-sm text-text-tertiary">
                    Enter the invite code from your roommate
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

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-body-sm font-medium text-text-secondary mb-1.5">
                  Invite Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={rawCode}
                    onChange={handleCodeChange}
                    placeholder="e.g. DORM-X9K2L1"
                    maxLength={15}
                    className="w-full px-4 py-3.5 rounded-xl bg-bg-surface border border-border-subtle text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-teal focus:ring-1 focus:ring-accent-teal transition-all text-body-lg font-mono tracking-widest uppercase font-semibold"
                    autoFocus
                    disabled={isJoining}
                  />
                  {isValidating && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-accent-teal border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <p className="text-caption text-text-tertiary mt-1">
                  Invite codes are 6 characters and valid for 24 hours
                </p>
              </div>

              {/* Preview card when code is recognized */}
              {previewDorm && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={SPRING.subtle}
                  className="p-4 rounded-2xl bg-accent-teal/10 border border-accent-teal/30 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🏠</span>
                    <div>
                      <p className="text-caption text-accent-teal font-medium uppercase tracking-wider">
                        Found Dorm
                      </p>
                      <p className="text-heading-3 font-semibold text-text-primary">
                        {previewDorm.name}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-accent-teal/20 text-accent-teal text-caption font-semibold">
                    ✓ Valid Code
                  </span>
                </motion.div>
              )}

              <div>
                <label className="block text-body-sm font-medium text-text-secondary mb-1.5">
                  Your Move-in Date
                </label>
                <input
                  type="date"
                  value={moveInDate}
                  onChange={(e) => setMoveInDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border-subtle text-text-primary focus:outline-none focus:border-accent-teal focus:ring-1 focus:ring-accent-teal transition-all text-body-md font-mono"
                  disabled={isJoining}
                />
                <p className="text-caption text-text-tertiary mt-1">
                  You won&apos;t be billed for cycles before your move-in date
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isJoining}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isJoining || (!previewDorm && normalizeInviteCode(rawCode).length < 6)}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {isJoining ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Joining...
                    </>
                  ) : (
                    "Join Dorm"
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

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING } from "@/lib/utils/constants";
import { formatDisplayCode, isInviteExpired } from "@/lib/utils/invite";
import type { DormInvite } from "@/lib/supabase/types";
import { useTranslation } from "@/lib/context/LanguageContext";

interface InviteModalProps {
  isOpen: boolean;
  dormName: string;
  activeInvites: DormInvite[];
  onClose: () => void;
  onGenerateNew: () => Promise<DormInvite>;
}

export function InviteModal({
  isOpen,
  dormName,
  activeInvites,
  onClose,
  onGenerateNew,
}: InviteModalProps) {
  const { t } = useTranslation();
  const [copiedType, setCopiedType] = useState<"code" | "link" | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Latest active (non-expired & non-used) invite
  const latestValidInvite = activeInvites.find(
    (inv) => !inv.is_used && !isInviteExpired(inv.expires_at)
  );

  const currentCode = latestValidInvite ? formatDisplayCode(latestValidInvite.code) : "";
  const shareUrl = typeof window !== "undefined" && latestValidInvite
    ? `${window.location.origin}/join/${latestValidInvite.code}`
    : "";

  const handleCopyCode = async (codeStr: string) => {
    try {
      await navigator.clipboard.writeText(codeStr);
      setCopiedType("code");
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  const handleCopyLink = async (urlStr: string) => {
    try {
      await navigator.clipboard.writeText(urlStr);
      setCopiedType("link");
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      setError("Failed to copy link");
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share && latestValidInvite) {
      try {
        await navigator.share({
          title: `Join ${dormName} on Hatian`,
          text: `Hey! Join our dorm "${dormName}" on Hatian to split bills fairly. Use code ${formatDisplayCode(latestValidInvite.code)} or click the link:`,
          url: shareUrl,
        });
      } catch {
        // User cancelled or share failed, fallback to copy
        handleCopyLink(shareUrl);
      }
    } else {
      handleCopyLink(shareUrl);
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      await onGenerateNew();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate invite";
      setError(msg);
    } finally {
      setIsGenerating(false);
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

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="text-2xl p-2 rounded-2xl bg-accent-teal/10 text-accent-teal">
                  ✉️
                </span>
                <div>
                  <h2 className="text-heading-3 font-semibold text-text-primary">
                    {t("dorm.inviteCodeCardTitle")}
                  </h2>
                  <p className="text-body-sm text-text-tertiary">
                    {t("dorm.inviteCodeSub")}
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

            {latestValidInvite ? (
              <div className="space-y-4">
                {/* Code display card */}
                <div className="p-6 rounded-2xl bg-bg-surface border border-accent-teal/30 text-center relative overflow-hidden">
                  <div className="absolute top-2 right-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-teal/15 text-accent-teal text-caption font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-teal animate-pulse" />
                      Active (24h)
                    </span>
                  </div>

                  <p className="text-caption text-text-tertiary uppercase tracking-wider mb-2">
                    {t("dorm.inviteCodeCardTitle")}
                  </p>
                  <p className="text-heading-1 font-mono font-bold text-accent-teal tracking-widest my-2 select-all">
                    {currentCode}
                  </p>
                  <p className="text-caption text-text-tertiary">
                    Expires in 24 hours • One-time use per member
                  </p>
                </div>

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleCopyCode(latestValidInvite.code)}
                    className="btn-secondary flex items-center justify-center gap-2 py-3"
                  >
                    {copiedType === "code" ? (
                      <span className="text-accent-teal font-medium">{t("dorm.copiedBtn")}</span>
                    ) : (
                      <>
                        <span>📋</span> {t("dorm.copyCodeBtn")}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="btn-primary flex items-center justify-center gap-2 py-3"
                  >
                    {copiedType === "link" ? (
                      <span className="font-medium">✓ Link Copied!</span>
                    ) : (
                      <>
                        <span>🔗</span> Share Link
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* No active invite state */
              <div className="p-6 rounded-2xl bg-bg-surface border border-border-subtle text-center space-y-3">
                <p className="text-body-md font-medium text-text-primary">
                  No active invite code
                </p>
                <p className="text-body-sm text-text-tertiary max-w-[260px] mx-auto">
                  {t("dorm.inviteCodeSub")}
                </p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="btn-primary w-full max-w-[240px] mx-auto flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    t("dorm.newCodeBtn")
                  )}
                </button>
              </div>
            )}

            {/* Quick generate fresh code button */}
            {latestValidInvite && (
              <div className="mt-4 pt-4 border-t border-border-subtle flex justify-between items-center">
                <span className="text-caption text-text-tertiary">
                  Need a fresh code?
                </span>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="text-body-sm text-accent-teal hover:underline font-medium flex items-center gap-1.5"
                >
                  {isGenerating ? "Generating..." : `+ ${t("dorm.newCodeBtn")}`}
                </button>
              </div>
            )}

            {/* Past / Recent Invites List */}
            {activeInvites.length > 1 && (
              <div className="mt-5 pt-4 border-t border-border-subtle">
                <p className="text-caption font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                  Recent Codes
                </p>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {activeInvites.slice(1, 5).map((inv) => {
                    const isExp = isInviteExpired(inv.expires_at);
                    return (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-bg-surface text-body-sm"
                      >
                        <span className="font-mono font-medium text-text-secondary">
                          {formatDisplayCode(inv.code)}
                        </span>
                        <div className="flex items-center gap-2">
                          {inv.is_used ? (
                            <span className="px-2 py-0.5 rounded-md bg-accent-sage/15 text-accent-sage text-caption">
                              Used
                            </span>
                          ) : isExp ? (
                            <span className="px-2 py-0.5 rounded-md bg-accent-terracotta/15 text-accent-terracotta text-caption">
                              Expired
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-accent-teal/15 text-accent-teal text-caption">
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

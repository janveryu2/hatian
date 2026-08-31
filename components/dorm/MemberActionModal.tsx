"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING } from "@/lib/utils/constants";
import type { DormMemberWithProfile } from "@/lib/hooks/useDorm";

interface MemberActionModalProps {
  isOpen: boolean;
  member: DormMemberWithProfile | null;
  currentUserId: string;
  onClose: () => void;
  onUpdateRole: (memberId: string, role: "admin" | "member") => Promise<void>;
  onUpdateStatus: (
    memberId: string,
    status: "active" | "inactive",
    moveOutDate?: string
  ) => Promise<void>;
  onRemove: (memberId: string) => Promise<void>;
}

export function MemberActionModal({
  isOpen,
  member,
  currentUserId,
  onClose,
  onUpdateRole,
  onUpdateStatus,
  onRemove,
}: MemberActionModalProps) {
  const [moveOutDate, setMoveOutDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!member) return null;

  const isSelf = member.user_id === currentUserId;
  const displayName =
    member.profile?.display_name || member.profile?.email || "Roommate";

  const handleRoleToggle = async () => {
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
    try {
      setIsProcessing(true);
      setError(null);
      await onRemove(member.id);
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
            transition={SPRING.modal}
            className="relative w-full max-w-lg bg-bg-card border border-border-subtle rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
            }}
          >
            <div className="w-12 h-1.5 bg-border-subtle rounded-full mx-auto mb-4 sm:hidden" />

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
                        You
                      </span>
                    )}
                  </h2>
                  <p className="text-body-sm text-text-tertiary">
                    {member.profile?.email || "Roommate"}
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
                  {member.role}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-bg-surface border border-border-subtle">
                <span className="text-caption text-text-tertiary uppercase block mb-0.5">
                  Move-In Date
                </span>
                <span className="text-body-md font-semibold text-text-primary font-mono">
                  {member.move_in_date}
                </span>
              </div>
            </div>

            {!showRemoveConfirm ? (
              <div className="space-y-3">
                {/* Change Role Button */}
                <button
                  type="button"
                  onClick={handleRoleToggle}
                  disabled={isProcessing || isSelf}
                  className="w-full p-4 rounded-2xl bg-bg-surface border border-border-subtle hover:border-accent-teal/50 transition-colors flex items-center justify-between text-left disabled:opacity-50"
                >
                  <div>
                    <p className="text-body-md font-medium text-text-primary">
                      {member.role === "admin"
                        ? "Demote to Member"
                        : "Promote to Admin"}
                    </p>
                    <p className="text-caption text-text-tertiary">
                      {member.role === "admin"
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
                    className="w-full p-3 text-accent-terracotta text-body-sm font-medium hover:bg-accent-terracotta/10 rounded-xl transition-colors text-center"
                  >
                    Remove from Dorm...
                  </button>
                )}
              </div>
            ) : (
              /* Remove Member Confirmation View */
              <div className="p-5 rounded-2xl bg-accent-terracotta/10 border border-accent-terracotta/30 text-center space-y-3">
                <span className="text-3xl">⚠️</span>
                <p className="text-body-md font-semibold text-text-primary">
                  Remove {displayName}?
                </p>
                <p className="text-caption text-text-tertiary max-w-[280px] mx-auto">
                  They will lose access to this dorm and its bills immediately. Past settle-up records will remain preserved.
                </p>
                <div className="flex gap-2.5 pt-2">
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
                    {isProcessing ? "Removing..." : "Yes, Remove"}
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

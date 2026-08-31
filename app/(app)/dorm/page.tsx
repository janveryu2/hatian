"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING, STAGGER_DELAY } from "@/lib/utils/constants";
import { useAuth } from "@/lib/hooks/useAuth";
import { useDorm, type DormMemberWithProfile } from "@/lib/hooks/useDorm";
import { useSettlement } from "@/lib/hooks/useSettlement";
import { CreateDormModal } from "@/components/dorm/CreateDormModal";
import { JoinDormModal } from "@/components/dorm/JoinDormModal";
import { InviteModal } from "@/components/dorm/InviteModal";
import { MemberActionModal } from "@/components/dorm/MemberActionModal";
import { LoadingSkeletonHero, LoadingSkeletonCard } from "@/components/ui/LoadingSkeleton";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: STAGGER_DELAY, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: SPRING.page },
};

export default function DormPage() {
  const { user } = useAuth();
  const { netBalances } = useSettlement();
  const {
    dorms,
    activeDorm,
    members,
    activeInvites,
    isAdmin,
    isLoading,
    error,
    createDorm,
    joinDormByCode,
    validateInviteCode,
    createInvite,
    updateMemberRole,
    setMemberStatus,
    removeMember,
    leaveDorm,
    switchActiveDorm,
  } = useDorm();

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedMember, setSelectedMember] =
    useState<DormMemberWithProfile | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  if (isLoading) {
    return (
      <div
        className="px-5 pt-4 max-w-lg mx-auto space-y-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
      >
        <div className="space-y-1.5 mb-4">
          <div className="w-28 h-7 rounded-lg bg-bg-surface/80 animate-pulse" />
          <div className="w-44 h-4 rounded-md bg-bg-surface/50 animate-pulse" />
        </div>
        <LoadingSkeletonHero />
        <LoadingSkeletonCard />
        <LoadingSkeletonCard />
      </div>
    );
  }

  // State 1: No Dorms Joined Yet
  if (!activeDorm || dorms.length === 0) {
    return (
      <motion.div
        className="px-5 pt-4 max-w-lg mx-auto"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-heading-1 text-text-primary mb-1">Your Dorm</h1>
          <p className="text-body-sm text-text-tertiary mb-6">
            Manage your household and roommates
          </p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="card p-8 sm:p-10 flex flex-col items-center text-center relative overflow-hidden"
        >
          <div className="w-20 h-20 rounded-3xl bg-accent-teal/10 border border-accent-teal/20 flex items-center justify-center text-4xl mb-5">
            🏠
          </div>

          <h2 className="text-heading-2 text-text-primary font-semibold mb-2">
            No Dorm Yet
          </h2>
          <p className="text-body-sm text-text-tertiary mb-8 max-w-[280px]">
            Create a shared dorm to split recurring bills with roommates, or join with an invite code.
          </p>

          <div className="flex flex-col gap-3.5 w-full max-w-[300px]">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-accent-teal/10"
            >
              <span>✨</span> Create a Dorm
            </button>
            <button
              onClick={() => setIsJoinOpen(true)}
              className="btn-secondary w-full py-3.5 flex items-center justify-center gap-2"
            >
              <span>🔑</span> Join with Code
            </button>
          </div>
        </motion.div>

        {/* Modals */}
        <CreateDormModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={async (name, moveIn) => {
            await createDorm(name, moveIn);
          }}
        />

        <JoinDormModal
          isOpen={isJoinOpen}
          onClose={() => setIsJoinOpen(false)}
          onValidate={validateInviteCode}
          onJoin={async (code, moveIn) => {
            await joinDormByCode(code, moveIn);
          }}
        />
      </motion.div>
    );
  }

  // State 2: Active Dorm Dashboard
  const activeMembers = members.filter((m) => m.status === "active");
  const inactiveMembers = members.filter((m) => m.status === "inactive");

  return (
    <motion.div
      className="px-5 pt-4 max-w-xl mx-auto space-y-6"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Top Header & Dorm Selector */}
      <motion.div
        variants={itemVariants}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🏠</span>
            {dorms.length > 1 ? (
              <select
                value={activeDorm.id}
                onChange={(e) => switchActiveDorm(e.target.value)}
                className="text-heading-2 font-bold text-text-primary bg-transparent border-b border-border-subtle focus:outline-none cursor-pointer pr-4"
              >
                {dorms.map((d) => (
                  <option key={d.id} value={d.id} className="bg-bg-card">
                    {d.name}
                  </option>
                ))}
              </select>
            ) : (
              <h1 className="text-heading-1 font-bold text-text-primary tracking-tight">
                {activeDorm.name}
              </h1>
            )}
          </div>
          <p className="text-body-sm text-text-tertiary">
            Household Management • Currency: {activeDorm.currency} (₱)
          </p>
        </div>

        {/* User Role Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-caption font-semibold uppercase tracking-wider ${
              isAdmin
                ? "bg-accent-terracotta/15 text-accent-terracotta border border-accent-terracotta/25"
                : "bg-accent-teal/15 text-accent-teal border border-accent-teal/25"
            }`}
          >
            {isAdmin ? "👑 Admin" : "👤 Member"}
          </span>
        </div>
      </motion.div>

      {error && (
        <div className="p-3.5 rounded-xl bg-accent-terracotta/10 border border-accent-terracotta/20 text-accent-terracotta text-body-sm">
          {error}
        </div>
      )}

      {/* Overview Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
        <div className="card p-3.5 text-center">
          <span className="text-caption text-text-tertiary uppercase tracking-wider block mb-1">
            Roommates
          </span>
          <p className="text-heading-2 font-mono font-bold text-text-primary">
            {activeMembers.length}
          </p>
        </div>

        <div className="card p-3.5 text-center">
          <span className="text-caption text-text-tertiary uppercase tracking-wider block mb-1">
            Active Codes
          </span>
          <p className="text-heading-2 font-mono font-bold text-accent-teal">
            {activeInvites.filter((i) => !i.is_used).length}
          </p>
        </div>

        <div className="card p-3.5 text-center">
          <span className="text-caption text-text-tertiary uppercase tracking-wider block mb-1">
            Currency
          </span>
          <p className="text-heading-2 font-mono font-bold text-accent-sand">
            ₱ PHP
          </p>
        </div>
      </motion.div>

      {/* Primary Actions */}
      <motion.div variants={itemVariants} className="flex gap-3">
        <button
          onClick={() => setIsInviteOpen(true)}
          className="flex-1 btn-primary py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-accent-teal/10"
        >
          <span>✉️</span> Invite Roommates
        </button>

        <button
          onClick={() => setIsJoinOpen(true)}
          className="btn-secondary py-3.5 px-4 flex items-center justify-center gap-1.5"
          title="Join another dorm"
        >
          <span>🔑</span> Join Another
        </button>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="btn-secondary py-3.5 px-4 flex items-center justify-center gap-1.5"
          title="Create another dorm"
        >
          <span>+</span>
        </button>
      </motion.div>

      {/* Roommates List Section */}
      <motion.div variants={itemVariants} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-heading-3 font-semibold text-text-primary">
            Roommates ({activeMembers.length})
          </h2>
          {isAdmin && (
            <span className="text-caption text-text-tertiary">
              Tap a roommate to manage
            </span>
          )}
        </div>

        <div className="space-y-2.5">
          {members.map((member) => {
            const isMe = member.user_id === user?.id;
            const displayName =
              member.profile?.display_name ||
              member.profile?.email ||
              "Roommate";

            return (
              <motion.div
                key={member.id}
                whileTap={isAdmin ? { scale: 0.98 } : undefined}
                onClick={() => {
                  if (isAdmin) {
                    setSelectedMember(member);
                  }
                }}
                className={`card p-4 flex items-center justify-between gap-3 transition-colors ${
                  isAdmin ? "cursor-pointer hover:border-accent-teal/40" : ""
                } ${member.status === "inactive" ? "opacity-60" : ""}`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-accent-teal/10 border border-accent-teal/20 flex items-center justify-center text-heading-3 font-semibold text-accent-teal uppercase overflow-hidden shrink-0">
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

                  <div className="min-w-0">
                    <p className="text-body-md font-semibold text-text-primary truncate flex items-center gap-1.5">
                      {displayName}
                      {isMe && (
                        <span className="text-caption px-2 py-0.2 rounded-full bg-accent-teal/15 text-accent-teal shrink-0">
                          You
                        </span>
                      )}
                    </p>
                    <p className="text-caption text-text-tertiary truncate">
                      Since {member.move_in_date}
                      {member.status === "inactive" &&
                        ` • Moved out ${member.move_out_date || ""}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-caption font-semibold capitalize ${
                      member.role === "admin"
                        ? "bg-accent-terracotta/15 text-accent-terracotta"
                        : "bg-bg-surface text-text-secondary border border-border-subtle"
                    }`}
                  >
                    {member.role}
                  </span>

                  {isAdmin && (
                    <span className="text-text-tertiary text-body-sm">›</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Dorm Actions / Danger Zone */}
      <motion.div variants={itemVariants} className="pt-4 border-t border-border-subtle">
        {!showLeaveConfirm ? (
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="w-full py-3 text-body-sm font-medium text-accent-terracotta hover:bg-accent-terracotta/10 rounded-xl transition-colors text-center"
          >
            Leave this Dorm...
          </button>
        ) : (
          <div className="p-4 rounded-2xl bg-accent-terracotta/10 border border-accent-terracotta/30 space-y-3">
            <p className="text-body-sm font-semibold text-text-primary text-center">
              Are you sure you want to leave {activeDorm.name}?
            </p>
            <p className="text-caption text-text-tertiary text-center">
              You will lose access to active bills and upcoming splits.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                disabled={isLeaving}
                className="flex-1 btn-secondary py-2 text-body-sm"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    setIsLeaving(true);
                    await leaveDorm();
                    setShowLeaveConfirm(false);
                  } catch (err: unknown) {
                    alert(err instanceof Error ? err.message : "Failed to leave");
                  } finally {
                    setIsLeaving(false);
                  }
                }}
                disabled={isLeaving}
                className="flex-1 px-3 py-2 rounded-xl bg-accent-terracotta text-white font-medium text-body-sm hover:opacity-90 transition-opacity"
              >
                {isLeaving ? "Leaving..." : "Yes, Leave"}
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <CreateDormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={async (name, moveIn) => {
          await createDorm(name, moveIn);
        }}
      />

      <JoinDormModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onValidate={validateInviteCode}
        onJoin={async (code, moveIn) => {
          await joinDormByCode(code, moveIn);
        }}
      />

      <InviteModal
        isOpen={isInviteOpen}
        dormName={activeDorm.name}
        activeInvites={activeInvites}
        onClose={() => setIsInviteOpen(false)}
        onGenerateNew={async () => {
          return await createInvite();
        }}
      />

      <MemberActionModal
        isOpen={!!selectedMember}
        member={selectedMember}
        currentUserId={user?.id || ""}
        totalAdmins={members.filter((m) => m.role === "admin" && m.status === "active").length}
        memberBalanceCentavos={selectedMember ? netBalances.get(selectedMember.id) || 0 : 0}
        onClose={() => setSelectedMember(null)}
        onUpdateRole={updateMemberRole}
        onUpdateStatus={setMemberStatus}
        onRemove={removeMember}
      />
    </motion.div>
  );
}

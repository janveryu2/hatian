"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { useDorm } from "@/lib/hooks/useDorm";
import { getGreeting, formatToday } from "@/lib/utils/dates";
import { SPRING, STAGGER_DELAY } from "@/lib/utils/constants";

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

export default function HomePage() {
  const { profile } = useAuth();
  const { activeDorm, members, isLoading: isDormLoading } = useDorm();

  const firstName = profile?.display_name?.split(" ")[0] ?? "there";
  const activeMembers = members.filter((m) => m.status === "active");

  return (
    <motion.div
      className="px-5 pt-4 max-w-xl mx-auto space-y-6"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Greeting Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between">
        <div>
          <p className="text-body-sm text-text-tertiary">{formatToday()}</p>
          <h1 className="text-heading-1 font-bold text-text-primary tracking-tight mt-0.5">
            {getGreeting()}, {firstName}!
          </h1>
        </div>

        {activeDorm && (
          <Link
            href="/dorm"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-surface border border-border-subtle hover:border-accent-teal/40 transition-colors"
          >
            <span className="text-body-sm">🏠</span>
            <span className="text-body-sm font-medium text-text-primary max-w-[120px] truncate">
              {activeDorm.name}
            </span>
          </Link>
        )}
      </motion.div>

      {/* No Dorm Alert Banner */}
      {!isDormLoading && !activeDorm && (
        <motion.div
          variants={itemVariants}
          className="p-5 rounded-3xl bg-gradient-to-r from-accent-teal/15 via-accent-sand/10 to-transparent border border-accent-teal/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <span className="text-3xl p-2 rounded-2xl bg-accent-teal/20">🏠</span>
            <div>
              <p className="text-body-md font-semibold text-text-primary">
                Join or Create a Dorm
              </p>
              <p className="text-body-sm text-text-tertiary">
                Set up your household to start splitting bills
              </p>
            </div>
          </div>
          <Link
            href="/dorm"
            className="btn-primary py-2.5 px-5 text-body-sm shrink-0 w-full sm:w-auto text-center"
          >
            Get Started →
          </Link>
        </motion.div>
      )}

      {/* Balance cards — You Owe / Owed to You */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
        <div
          className="card p-4 flex flex-col gap-1.5"
          style={{ borderLeft: "3px solid var(--accent-coral)" }}
        >
          <span className="text-caption text-text-tertiary uppercase tracking-wider">
            You Owe
          </span>
          <span
            className="text-currency-lg font-mono font-bold"
            style={{ color: "var(--accent-coral)" }}
          >
            ₱0.00
          </span>
          <span className="text-caption text-text-tertiary">All settled up</span>
        </div>

        <div
          className="card p-4 flex flex-col gap-1.5"
          style={{ borderLeft: "3px solid var(--accent-teal)" }}
        >
          <span className="text-caption text-text-tertiary uppercase tracking-wider">
            Owed to You
          </span>
          <span
            className="text-currency-lg font-mono font-bold"
            style={{ color: "var(--accent-teal)" }}
          >
            ₱0.00
          </span>
          <span className="text-caption text-text-tertiary">0 pending claims</span>
        </div>
      </motion.div>

      {/* Active Dorm Quick Info */}
      {activeDorm && (
        <motion.div variants={itemVariants} className="card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2 overflow-hidden">
              {activeMembers.slice(0, 3).map((m, idx) => (
                <div
                  key={m.id}
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-bg-card bg-accent-teal/20 text-accent-teal font-semibold text-caption flex items-center justify-center uppercase overflow-hidden"
                  style={{ zIndex: 3 - idx }}
                >
                  {m.profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.profile.avatar_url}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (m.profile?.display_name || "R").charAt(0)
                  )}
                </div>
              ))}
            </div>
            <div>
              <p className="text-body-sm font-medium text-text-primary">
                {activeMembers.length} {activeMembers.length === 1 ? "Roommate" : "Roommates"}
              </p>
              <p className="text-caption text-text-tertiary">In {activeDorm.name}</p>
            </div>
          </div>

          <Link
            href="/dorm"
            className="text-body-sm text-accent-teal font-medium hover:underline flex items-center gap-1"
          >
            Manage Dorm ›
          </Link>
        </motion.div>
      )}

      {/* Upcoming Bills Section */}
      <motion.div variants={itemVariants} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-heading-3 font-semibold text-text-primary">
            Upcoming Bills
          </h2>
          <Link
            href="/bills"
            className="text-body-sm text-accent-teal font-medium hover:underline"
          >
            View all ›
          </Link>
        </div>

        <div className="card p-8 flex flex-col items-center text-center">
          <div className="text-4xl mb-2.5">📋</div>
          <p className="text-body-md text-text-secondary font-medium">
            No upcoming bills
          </p>
          <p className="text-body-sm text-text-tertiary mt-1 max-w-[240px]">
            Your first split is just a tap away
          </p>
        </div>
      </motion.div>

      {/* Quick Settle / Activity Section */}
      <motion.div variants={itemVariants} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-heading-3 font-semibold text-text-primary">
            Recent Activity
          </h2>
        </div>

        <div className="card p-8 flex flex-col items-center text-center">
          <div className="text-4xl mb-2.5">✨</div>
          <p className="text-body-md text-text-secondary font-medium">
            No activity yet
          </p>
          <p className="text-body-sm text-text-tertiary mt-1 max-w-[240px]">
            Payments, bill creations, and settlements will appear here
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

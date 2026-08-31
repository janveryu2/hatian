"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { useDorm } from "@/lib/hooks/useDorm";
import { useBills } from "@/lib/hooks/useBills";
import { useSettlement } from "@/lib/hooks/useSettlement";
import { getGreeting, formatToday } from "@/lib/utils/dates";
import { formatCentavos } from "@/lib/utils/currency";
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
  const { bills } = useBills();
  const { myNetBalance, payments } = useSettlement();

  const firstName = profile?.display_name?.split(" ")[0] ?? "there";
  const activeMembers = members.filter((m) => m.status === "active");

  const youOweCentavos = myNetBalance < 0 ? Math.abs(myNetBalance) : 0;
  const owedToYouCentavos = myNetBalance > 0 ? myNetBalance : 0;

  const upcomingBills = bills.filter((b) => !b.isFullySettled).slice(0, 3);
  const recentPayments = payments.slice(0, 3);

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

      {/* Live Net Balance Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
        <Link
          href="/settle"
          className="card p-4 flex flex-col gap-1.5 hover:border-accent-coral/50 transition-colors"
          style={{ borderLeft: "3px solid var(--accent-coral)" }}
        >
          <span className="text-caption text-text-tertiary uppercase tracking-wider">
            You Owe
          </span>
          <span
            className="text-currency-lg font-mono font-bold"
            style={{ color: "var(--accent-coral)" }}
          >
            {formatCentavos(youOweCentavos)}
          </span>
          <span className="text-caption text-text-tertiary">
            {youOweCentavos === 0 ? "All settled up" : "Tap to Settle Up →"}
          </span>
        </Link>

        <Link
          href="/settle"
          className="card p-4 flex flex-col gap-1.5 hover:border-accent-teal/50 transition-colors"
          style={{ borderLeft: "3px solid var(--accent-teal)" }}
        >
          <span className="text-caption text-text-tertiary uppercase tracking-wider">
            Owed to You
          </span>
          <span
            className="text-currency-lg font-mono font-bold"
            style={{ color: "var(--accent-teal)" }}
          >
            {formatCentavos(owedToYouCentavos)}
          </span>
          <span className="text-caption text-text-tertiary">
            {owedToYouCentavos === 0 ? "No pending claims" : "From roommates"}
          </span>
        </Link>
      </motion.div>

      {/* Roommates Card */}
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
            View all ({bills.length}) ›
          </Link>
        </div>

        {upcomingBills.length === 0 ? (
          <div className="card p-6 flex flex-col items-center text-center">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-body-sm text-text-secondary font-medium">
              No unpaid bills
            </p>
            <p className="text-caption text-text-tertiary mt-0.5">
              Everything is settled up or add a new bill in the Bills tab
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcomingBills.map((b) => (
              <Link
                key={b.id}
                href="/bills"
                className="card p-3.5 flex items-center justify-between gap-3 hover:border-accent-teal/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl p-1.5 rounded-xl bg-accent-teal/10">
                    {b.category?.icon || "📋"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-body-sm font-semibold text-text-primary truncate">
                      {b.category?.name || "Bill"}
                    </p>
                    <p className="text-caption text-text-tertiary">
                      Due {b.due_date}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-mono font-bold text-text-primary text-body-sm">
                    {formatCentavos(b.amount_centavos)}
                  </p>
                  <span className="text-caption text-accent-teal font-medium">
                    {b.shares.length} shares
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </motion.div>

      {/* Recent Activity Section */}
      <motion.div variants={itemVariants} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-heading-3 font-semibold text-text-primary">
            Recent Settle Activity
          </h2>
          <Link
            href="/settle"
            className="text-body-sm text-accent-teal font-medium hover:underline"
          >
            Settle Hub ›
          </Link>
        </div>

        {recentPayments.length === 0 ? (
          <div className="card p-6 flex flex-col items-center text-center">
            <div className="text-3xl mb-2">✨</div>
            <p className="text-body-sm text-text-secondary font-medium">
              No recent settlements
            </p>
            <p className="text-caption text-text-tertiary mt-0.5">
              Settlements via GCash, Maya, or bank transfers will show here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentPayments.map((p) => (
              <div
                key={p.id}
                className="card p-3 flex items-center justify-between gap-3 text-body-sm"
              >
                <div>
                  <p className="font-medium text-text-primary">
                    {p.fromName} → {p.toName}
                  </p>
                  <p className="text-caption text-text-tertiary">
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-text-primary text-body-sm">
                    {formatCentavos(p.amount_centavos)}
                  </p>
                  <span className="text-caption text-accent-sage font-medium">
                    {p.status === "confirmed" ? "Confirmed ✓" : "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

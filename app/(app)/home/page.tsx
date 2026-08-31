"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/lib/hooks/useAuth";
import { getGreeting, formatToday } from "@/lib/utils/dates";
import { SPRING, STAGGER_DELAY } from "@/lib/utils/constants";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER_DELAY,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: SPRING.page,
  },
};

export default function HomePage() {
  const { profile } = useAuth();

  const firstName = profile?.display_name?.split(" ")[0] ?? "there";

  return (
    <motion.div
      className="px-5 pt-4"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Greeting */}
      <motion.div variants={itemVariants} className="mb-6">
        <p className="text-body-sm text-text-tertiary">{formatToday()}</p>
        <h1 className="text-heading-1 text-text-primary mt-1">
          {getGreeting()}, {firstName}!
        </h1>
      </motion.div>

      {/* Balance cards — You Owe / Owed to You */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 mb-6">
        <div
          className="card p-4 flex flex-col gap-2"
          style={{ borderLeft: "3px solid var(--accent-coral)" }}
        >
          <span className="text-caption text-text-tertiary">You Owe</span>
          <span className="text-currency-lg" style={{ color: "var(--accent-coral)" }}>
            ₱0.00
          </span>
        </div>
        <div
          className="card p-4 flex flex-col gap-2"
          style={{ borderLeft: "3px solid var(--accent-teal)" }}
        >
          <span className="text-caption text-text-tertiary">Owed to You</span>
          <span className="text-currency-lg" style={{ color: "var(--accent-teal)" }}>
            ₱0.00
          </span>
        </div>
      </motion.div>

      {/* Upcoming Bills — empty state */}
      <motion.div variants={itemVariants} className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-heading-3 text-text-primary">Upcoming Bills</h2>
          <span className="text-body-sm text-accent-teal font-medium cursor-pointer">
            View all
          </span>
        </div>
        <div className="card p-8 flex flex-col items-center text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-body text-text-secondary font-medium">
            No upcoming bills
          </p>
          <p className="text-body-sm text-text-tertiary mt-1">
            Your first split is just a tap away
          </p>
        </div>
      </motion.div>

      {/* Recent Activity — empty state */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-heading-3 text-text-primary">Recent Activity</h2>
        </div>
        <div className="card p-8 flex flex-col items-center text-center">
          <div className="text-4xl mb-3">✨</div>
          <p className="text-body text-text-secondary font-medium">
            No activity yet
          </p>
          <p className="text-body-sm text-text-tertiary mt-1">
            Create a dorm and start adding bills
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

"use client";

import { motion } from "framer-motion";
import { SPRING, STAGGER_DELAY } from "@/lib/utils/constants";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: STAGGER_DELAY, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: SPRING.page },
};

export default function SettlePage() {
  return (
    <motion.div
      className="px-5 pt-4"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-heading-1 text-text-primary mb-1">Settle Up</h1>
        <p className="text-body-sm text-text-tertiary mb-6">
          Simplified payoff plan for your dorm
        </p>
      </motion.div>

      {/* Net balance card */}
      <motion.div
        variants={itemVariants}
        className="card p-6 flex flex-col items-center text-center mb-6"
        style={{ borderTop: "3px solid var(--accent-teal)" }}
      >
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
          style={{ background: "var(--accent-teal-soft)" }}
        >
          <span className="text-2xl">✓</span>
        </div>
        <p className="text-heading-3 text-text-primary font-semibold">
          All settled!
        </p>
        <p className="text-body-sm text-text-tertiary mt-1">
          No outstanding balances in your dorm
        </p>
      </motion.div>

      {/* Transactions empty state */}
      <motion.div variants={itemVariants}>
        <h2 className="text-heading-3 text-text-primary mb-3">Transactions</h2>
        <div className="card p-8 flex flex-col items-center text-center">
          <div className="text-4xl mb-3">🤝</div>
          <p className="text-body text-text-secondary font-medium">
            No pending transactions
          </p>
          <p className="text-body-sm text-text-tertiary mt-1">
            When bills are split, simplified payoffs will appear here
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

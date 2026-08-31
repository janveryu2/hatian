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

export default function BillsPage() {
  return (
    <motion.div
      className="px-5 pt-4"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-heading-1 text-text-primary mb-1">Bills</h1>
        <p className="text-body-sm text-text-tertiary mb-6">
          Track and split your shared expenses
        </p>
      </motion.div>

      {/* Filter chips placeholder */}
      <motion.div variants={itemVariants} className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {["All", "Internet", "Water", "Electricity", "Rent", "Other"].map(
          (cat, i) => (
            <button
              key={cat}
              className="px-4 py-2 rounded-full text-body-sm font-medium whitespace-nowrap transition-colors"
              style={{
                background: i === 0 ? "var(--accent-teal)" : "var(--bg-tertiary)",
                color: i === 0 ? "white" : "var(--text-secondary)",
              }}
            >
              {cat}
            </button>
          )
        )}
      </motion.div>

      {/* Empty state */}
      <motion.div variants={itemVariants} className="card p-10 flex flex-col items-center text-center">
        <div className="text-5xl mb-4">📄</div>
        <p className="text-body text-text-secondary font-medium">
          No bills yet
        </p>
        <p className="text-body-sm text-text-tertiary mt-1 mb-5 max-w-[240px]">
          Add your first bill and choose how to split it among your dorm-mates
        </p>
        <button className="btn-primary">+ Add Bill</button>
      </motion.div>
    </motion.div>
  );
}

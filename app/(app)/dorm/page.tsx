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

export default function DormPage() {
  return (
    <motion.div
      className="px-5 pt-4"
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

      {/* No dorm state */}
      <motion.div
        variants={itemVariants}
        className="card p-10 flex flex-col items-center text-center"
      >
        <div className="text-5xl mb-4">🏠</div>
        <p className="text-heading-3 text-text-primary font-semibold mb-2">
          No dorm yet
        </p>
        <p className="text-body-sm text-text-tertiary mb-6 max-w-[260px]">
          Create a new dorm or join an existing one with an invite code
        </p>
        <div className="flex flex-col gap-3 w-full max-w-[280px]">
          <button className="btn-primary w-full">Create a Dorm</button>
          <button className="btn-secondary w-full">Join with Code</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

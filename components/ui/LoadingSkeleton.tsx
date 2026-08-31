"use client";

import { motion } from "framer-motion";

export function LoadingSkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`card p-4 animate-pulse space-y-3 bg-bg-surface/50 border-border-subtle ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-bg-card/80" />
          <div className="space-y-1.5">
            <div className="w-24 h-4 rounded-md bg-bg-card/80" />
            <div className="w-16 h-3 rounded-md bg-bg-card/50" />
          </div>
        </div>
        <div className="w-20 h-6 rounded-md bg-bg-card/80" />
      </div>
    </div>
  );
}

export function LoadingSkeletonHero() {
  return (
    <div className="card p-6 animate-pulse space-y-3 bg-bg-surface/50 border-border-subtle">
      <div className="w-28 h-3.5 rounded-md bg-bg-card/60" />
      <div className="w-48 h-8 rounded-lg bg-bg-card/80" />
      <div className="w-36 h-4 rounded-md bg-bg-card/50" />
    </div>
  );
}

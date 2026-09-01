"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

/**
 * Root page — redirects to /login or /home based on auth state.
 */
export default function RootPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace("/home");
      } else {
        router.replace("/login");
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg-base">
      <div className="flex flex-col items-center gap-4">
        {/* App icon */}
        <div
          className="w-16 h-16 rounded-[18px] flex items-center justify-center shadow-lg shadow-accent-primary/20"
          style={{
            background:
              "linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))",
          }}
        >
          <span className="text-3xl text-white font-bold">÷</span>
        </div>
        <div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/context/AuthContext";
import { DormProvider } from "@/lib/context/DormContext";
import { BillsProvider } from "@/lib/context/BillsContext";
import { SettlementProvider } from "@/lib/context/SettlementContext";
import { BottomTabBar } from "@/components/bottom-tab-bar";

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  // Prevent flash while checking initial session
  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-bg-primary">
        <div className="w-6 h-6 border-2 border-accent-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-dvh bg-bg-primary flex flex-col">
      {/* Main content area — padded for bottom tab bar */}
      <main
        className="flex-1 pb-20"
        style={{
          paddingBottom:
            "calc(var(--tab-bar-height) + env(safe-area-inset-bottom, 0px) + 16px)",
        }}
      >
        {children}
      </main>

      <BottomTabBar />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DormProvider>
      <BillsProvider>
        <SettlementProvider>
          <AppLayoutContent>{children}</AppLayoutContent>
        </SettlementProvider>
      </BillsProvider>
    </DormProvider>
  );
}

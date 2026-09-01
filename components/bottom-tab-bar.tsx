"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { SPRING } from "@/lib/utils/constants";
import { useTranslation } from "@/lib/context/LanguageContext";

interface TabItem {
  href: string;
  label: string;
  matchPrefix: string;
  icon: (active: boolean) => React.ReactNode;
}

const TABS: TabItem[] = [
  {
    href: "/home",
    label: "Home",
    matchPrefix: "/home",
    icon: (active) => (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.3 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/bills",
    label: "Bills",
    matchPrefix: "/bills",
    icon: (active) => (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.3 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M7 9h10" />
        <path d="M7 13h6" />
      </svg>
    ),
  },
  {
    href: "/settle",
    label: "Settle Up",
    matchPrefix: "/settle",
    icon: (active) => (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.3 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
  {
    href: "/dorm",
    label: "Dorm",
    matchPrefix: "/dorm",
    icon: (active) => (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.3 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const tabs: TabItem[] = [
    { ...TABS[0], label: t("nav.home") },
    { ...TABS[1], label: t("nav.bills") },
    { ...TABS[2], label: t("nav.settle") },
    { ...TABS[3], label: t("nav.dorm") },
  ];

  return (
    <div
      className="fixed inset-x-0 z-40 flex justify-center pointer-events-none px-4 sm:px-6"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
      }}
    >
      <nav
        className="pointer-events-auto relative w-full max-w-[380px] sm:max-w-md p-1.5 rounded-full bg-[#121217]/90 backdrop-blur-2xl border border-white/[0.09] shadow-[0_16px_36px_rgba(0,0,0,0.7),0_0_20px_rgba(226,54,54,0.12)] flex items-center justify-between"
      >
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.matchPrefix);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative flex-1 flex items-center justify-center py-2 px-1 rounded-full text-center transition-colors select-none"
            >
              {isActive && (
                <motion.div
                  layoutId="floatingNavCapsule"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-accent-primary to-[#FF3E3E] shadow-[0_2px_14px_rgba(226,54,54,0.45)]"
                  transition={SPRING.tab}
                />
              )}

              <motion.div
                whileTap={{ scale: 0.9 }}
                transition={SPRING.micro}
                className="relative z-10 flex items-center justify-center gap-1.5"
              >
                <motion.div
                  animate={{
                    color: isActive ? "#FFFFFF" : "var(--text-tertiary)",
                    scale: isActive ? 1.05 : 1,
                  }}
                  transition={SPRING.tab}
                  className="shrink-0"
                >
                  {tab.icon(isActive)}
                </motion.div>

                {isActive && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.85, width: 0 }}
                    animate={{ opacity: 1, scale: 1, width: "auto" }}
                    exit={{ opacity: 0, scale: 0.85, width: 0 }}
                    transition={SPRING.tab}
                    className="text-caption font-bold text-white tracking-tight overflow-hidden whitespace-nowrap pr-0.5"
                  >
                    {tab.label}
                  </motion.span>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

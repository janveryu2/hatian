"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { SPRING } from "@/lib/utils/constants";
import { useTranslation } from "@/lib/context/LanguageContext";

interface TabItem {
  href: string;
  label: string;
  /** Matches any path starting with this prefix */
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
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
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
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
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
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
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
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
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
    {
      ...TABS[0],
      label: t("nav.home"),
    },
    {
      ...TABS[1],
      label: t("nav.bills"),
    },
    {
      ...TABS[2],
      label: t("nav.settle"),
    },
    {
      ...TABS[3],
      label: t("nav.dorm"),
    },
  ];

  const activeIndex = tabs.findIndex((tab) =>
    pathname.startsWith(tab.matchPrefix)
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-border-primary"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 6px)",
      }}
    >
      <div className="relative flex items-center justify-around h-14 max-w-lg mx-auto px-2">
        {/* Animated active indicator */}
        {activeIndex >= 0 && (
          <motion.div
            className="absolute top-0 h-[2.5px] rounded-full"
            style={{
              width: `${(100 / tabs.length) * 0.5}%`,
              left: `${(activeIndex * 100) / tabs.length + (100 / tabs.length) * 0.25}%`,
              background: "var(--accent-teal)",
            }}
            layoutId="tab-indicator"
            transition={SPRING.tab}
          />
        )}

        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.matchPrefix);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 relative select-none"
            >
              <motion.div
                whileTap={{ scale: 0.88 }}
                transition={SPRING.micro}
                className="flex flex-col items-center gap-0.5"
              >
                <motion.div
                  animate={{
                    color: isActive
                      ? "var(--accent-teal)"
                      : "var(--text-tertiary)",
                    scale: isActive ? 1.05 : 1,
                  }}
                  transition={SPRING.tab}
                >
                  {tab.icon(isActive)}
                </motion.div>
                <motion.span
                  className="text-[11px] font-semibold tracking-tight"
                  animate={{
                    color: isActive
                      ? "var(--accent-teal)"
                      : "var(--text-tertiary)",
                    opacity: isActive ? 1 : 0.8,
                  }}
                  transition={{ duration: 0.15 }}
                >
                  {tab.label}
                </motion.span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/components/theme-provider";
import { SPRING } from "@/lib/utils/constants";
import { useTranslation } from "@/lib/context/LanguageContext";

interface ThemeToggleProps {
  variant?: "header" | "card";
  className?: string;
}

export function ThemeToggle({
  variant = "card",
  className = "",
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const { language } = useTranslation();

  const options = [
    {
      id: "light" as const,
      label: language === "tl" ? "Maliwanag" : "Light",
      icon: "☀️",
    },
    {
      id: "dark" as const,
      label: language === "tl" ? "Madilim" : "Dark",
      icon: "🌙",
    },
    {
      id: "system" as const,
      label: language === "tl" ? "Auto" : "System",
      icon: "⚙️",
    },
  ];

  if (variant === "header") {
    return (
      <div
        className={`flex items-center p-0.5 rounded-full bg-bg-surface border border-border-hairline relative shadow-sm ${className}`}
      >
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            className={`px-2 py-1 rounded-full text-caption font-bold transition-colors relative z-10 flex items-center gap-1 ${
              theme === opt.id
                ? "text-text-primary"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
            title={opt.label}
          >
            <span>{opt.icon}</span>
            {theme === opt.id && (
              <motion.div
                layoutId="themeHeaderIndicator"
                className="absolute inset-0 rounded-full bg-accent-primary/15 text-accent-primary border border-accent-primary/30 -z-10"
                transition={SPRING.tab}
              />
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`card p-4 flex items-center justify-between gap-4 ${className}`}
    >
      <div>
        <p className="text-body-md font-semibold text-text-primary flex items-center gap-2">
          <span>🎨</span> {language === "tl" ? "Tema / Theme" : "Theme / Appearance"}
        </p>
        <p className="text-caption text-text-tertiary">
          {theme === "light"
            ? language === "tl"
              ? "Naka-Light mode"
              : "Light mode active"
            : theme === "dark"
            ? language === "tl"
              ? "Naka-Dark mode"
              : "Dark mode active"
            : language === "tl"
            ? "Sumusunod sa system ng phone"
            : "Follows system setting"}
        </p>
      </div>

      <div className="flex items-center p-1 rounded-2xl bg-bg-surface border border-border-hairline relative">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            className={`px-2.5 py-1.5 rounded-xl text-caption font-bold transition-colors relative z-10 flex items-center gap-1 ${
              theme === opt.id
                ? "text-text-primary"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            <span>{opt.icon}</span>
            <span className="hidden sm:inline">{opt.label}</span>
            {theme === opt.id && (
              <motion.div
                layoutId="themeCardIndicator"
                className="absolute inset-0 rounded-xl bg-bg-card shadow-sm border border-border-subtle -z-10"
                transition={SPRING.tab}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

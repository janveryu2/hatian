"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/lib/context/LanguageContext";
import { SPRING } from "@/lib/utils/constants";

interface LanguageToggleProps {
  variant?: "header" | "card";
  className?: string;
}

export function LanguageToggle({
  variant = "header",
  className = "",
}: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();

  if (variant === "card") {
    return (
      <div
        className={`card p-4 flex items-center justify-between gap-4 ${className}`}
      >
        <div>
          <p className="text-body-md font-semibold text-text-primary flex items-center gap-2">
            <span>🌐</span> Wika / Language
          </p>
          <p className="text-caption text-text-tertiary">
            {language === "tl"
              ? "Kasalukuyang naka-Taglish"
              : "Currently set to English"}
          </p>
        </div>

        <div className="flex items-center p-1 rounded-2xl bg-bg-surface border border-border-hairline relative">
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`px-3 py-1.5 rounded-xl text-caption font-bold transition-colors relative z-10 ${
              language === "en" ? "text-text-primary" : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            English
            {language === "en" && (
              <motion.div
                layoutId="languageCardIndicator"
                className="absolute inset-0 rounded-xl bg-bg-card shadow-sm border border-border-subtle -z-10"
                transition={SPRING.tab}
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setLanguage("tl")}
            className={`px-3 py-1.5 rounded-xl text-caption font-bold transition-colors relative z-10 ${
              language === "tl" ? "text-text-primary" : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            Tagalog
            {language === "tl" && (
              <motion.div
                layoutId="languageCardIndicator"
                className="absolute inset-0 rounded-xl bg-bg-card shadow-sm border border-border-subtle -z-10"
                transition={SPRING.tab}
              />
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center p-0.5 rounded-full bg-bg-surface border border-border-hairline relative shadow-sm ${className}`}
    >
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`px-2.5 py-1 rounded-full text-caption font-bold transition-colors relative z-10 ${
          language === "en"
            ? "text-text-primary"
            : "text-text-tertiary hover:text-text-secondary"
        }`}
        title="English"
      >
        EN
        {language === "en" && (
          <motion.div
            layoutId="languageHeaderIndicator"
            className="absolute inset-0 rounded-full bg-accent-primary/15 text-accent-primary border border-accent-primary/30 -z-10"
            transition={SPRING.tab}
          />
        )}
      </button>

      <button
        type="button"
        onClick={() => setLanguage("tl")}
        className={`px-2.5 py-1 rounded-full text-caption font-bold transition-colors relative z-10 ${
          language === "tl"
            ? "text-text-primary"
            : "text-text-tertiary hover:text-text-secondary"
        }`}
        title="Tagalog / Taglish"
      >
        TL
        {language === "tl" && (
          <motion.div
            layoutId="languageHeaderIndicator"
            className="absolute inset-0 rounded-full bg-accent-primary/15 text-accent-primary border border-accent-primary/30 -z-10"
            transition={SPRING.tab}
          />
        )}
      </button>
    </div>
  );
}

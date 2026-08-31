/**
 * App-wide constants.
 */

/** Predefined bill category definitions */
export const PREDEFINED_CATEGORIES = [
  { name: "Internet", icon: "📡", sort_order: 0 },
  { name: "Water", icon: "💧", sort_order: 1 },
  { name: "Electricity", icon: "⚡", sort_order: 2 },
  { name: "Rent", icon: "🏠", sort_order: 3 },
  { name: "Other", icon: "📦", sort_order: 4 },
] as const;

/** Category color map — maps category name to CSS variable */
export const CATEGORY_COLORS: Record<string, string> = {
  Internet: "var(--cat-internet)",
  Water: "var(--cat-water)",
  Electricity: "var(--cat-electricity)",
  Rent: "var(--cat-rent)",
  Other: "var(--cat-other)",
};

/** Split method labels */
export const SPLIT_METHOD_LABELS: Record<string, string> = {
  equal: "Equal",
  percentage: "Percentage",
  custom_amount: "Custom Amount",
  prorated_by_days: "By Days Present",
};

/** Spring animation presets */
export const SPRING = {
  /** For sheet modals — snappy with slight overshoot */
  sheet: { type: "spring" as const, damping: 30, stiffness: 300 },
  /** For tab transitions — smooth and natural */
  tab: { type: "spring" as const, damping: 25, stiffness: 200 },
  /** For micro-interactions — quick and subtle */
  micro: { type: "spring" as const, damping: 20, stiffness: 400 },
  /** For page content — gentle entry */
  page: { type: "spring" as const, damping: 28, stiffness: 180 },
  /** For list items — bouncy stagger */
  list: { type: "spring" as const, damping: 22, stiffness: 250 },
};

/** Stagger delay for list animations */
export const STAGGER_DELAY = 0.05;

/** Invite code config */
export const INVITE_CODE_LENGTH = 6;
export const INVITE_EXPIRY_HOURS = 24;

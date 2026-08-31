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

/** Spring animation presets — Tuned for iOS-grade physics */
export const SPRING = {
  /** For sheet modals — weighted decelerating iOS sheet entry */
  sheet: { type: "spring" as const, damping: 32, stiffness: 340, mass: 0.85 },
  /** For standard center modals */
  modal: { type: "spring" as const, damping: 28, stiffness: 320, mass: 0.8 },
  /** For tab transitions — tight, smooth crossfade & slide */
  tab: { type: "spring" as const, damping: 30, stiffness: 280, mass: 0.7 },
  /** For micro-interactions — quick, responsive */
  micro: { type: "spring" as const, damping: 24, stiffness: 450 },
  /** For subtle spring */
  subtle: { type: "spring" as const, damping: 26, stiffness: 260 },
  /** For page content — calm, gentle entry */
  page: { type: "spring" as const, damping: 30, stiffness: 240, mass: 0.8 },
  /** For list items — crisp, non-wobbly stagger */
  list: { type: "spring" as const, damping: 28, stiffness: 300, mass: 0.7 },
  /** Tactile button tap feedback */
  tap: { scale: 0.97, transition: { type: "spring" as const, damping: 20, stiffness: 500 } },
};

/** Stagger delay for list item entrances */
export const STAGGER_DELAY = 0.035;

/** Invite code config */
export const INVITE_CODE_LENGTH = 6;
export const INVITE_EXPIRY_HOURS = 24;

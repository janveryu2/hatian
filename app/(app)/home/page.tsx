"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { useDorm } from "@/lib/hooks/useDorm";
import { useBills } from "@/lib/hooks/useBills";
import { useSettlement } from "@/lib/hooks/useSettlement";
import { formatToday } from "@/lib/utils/dates";
import { formatCentavos } from "@/lib/utils/currency";
import { SPRING, STAGGER_DELAY } from "@/lib/utils/constants";

import { LoadingSkeletonHero, LoadingSkeletonCard } from "@/components/ui/LoadingSkeleton";
import { useTranslation } from "@/lib/context/LanguageContext";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER_DELAY,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: SPRING.page,
  },
};

export default function HomePage() {
  const { user, profile } = useAuth();
  const { activeDorm, members, isLoading: isDormLoading } = useDorm();
  const { bills } = useBills();
  const { myNetBalance, netBalances, payments } = useSettlement();
  const { t } = useTranslation();

  if (isDormLoading) {
    return (
      <div
        className="px-5 pt-4 max-w-xl mx-auto space-y-6"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
      >
        <div className="space-y-2 mb-4">
          <div className="w-24 h-4 rounded-md bg-bg-surface/50 animate-pulse" />
          <div className="w-56 h-10 rounded-xl bg-bg-surface/80 animate-pulse" />
        </div>
        <LoadingSkeletonHero />
        <div className="space-y-3">
          <LoadingSkeletonCard />
          <LoadingSkeletonCard />
        </div>
      </div>
    );
  }

  const firstName = profile?.display_name?.split(" ")[0] ?? "there";
  const activeMembers = members.filter((m) => m.status === "active");

  const youOweCentavos = myNetBalance < 0 ? Math.abs(myNetBalance) : 0;
  const owedToYouCentavos = myNetBalance > 0 ? myNetBalance : 0;
  const isNetPositive = myNetBalance > 0;
  const isNetNegative = myNetBalance < 0;
  const isNetZero = myNetBalance === 0;

  const upcomingBills = bills.filter((b) => !b.isFullySettled).slice(0, 3);
  const recentPayments = payments.slice(0, 3);

  // Dynamic localized greeting
  const hour = new Date().getHours();
  const greetingText =
    hour < 12
      ? t("home.greetingMorning")
      : hour < 18
      ? t("home.greetingAfternoon")
      : t("home.greetingEvening");

  return (
    <motion.div
      className="px-5 pt-4 max-w-xl mx-auto space-y-7"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 1. Header & Greeting Area with Visual Scale */}
      <motion.div variants={itemVariants} className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
            <p className="text-caption font-semibold uppercase tracking-wider text-text-tertiary">
              {formatToday()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle variant="header" />
            {activeDorm && (
              <Link
                href="/dorm"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-surface/80 backdrop-blur-md border border-white/[0.08] hover:border-accent-primary-border shadow-sm transition-all text-body-sm font-medium text-text-primary"
              >
                <span>🏠</span>
                <span className="max-w-[110px] truncate">{activeDorm.name}</span>
              </Link>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-[28px] sm:text-3xl font-extrabold text-text-primary tracking-tight leading-tight">
            {greetingText},{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-text-primary via-text-primary to-accent-primary">
              {firstName}
            </span>
          </h1>
        </div>
      </motion.div>

      {/* 2. No Dorm Alert Banner (Graphic Hero Moment) */}
      {!isDormLoading && !activeDorm && (
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-[28px] p-6 bg-gradient-to-br from-[#1E1E26] via-[#16161D] to-[#0F0F14] border border-accent-primary-border shadow-[0_12px_32px_rgba(0,0,0,0.5),0_0_24px_rgba(226,54,54,0.1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
        >
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-accent-primary/20 blur-3xl pointer-events-none" />

          <div className="flex items-start sm:items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-accent-primary-soft border border-accent-primary/30 flex items-center justify-center text-3xl shadow-lg shadow-accent-primary/20 shrink-0">
              🏠
            </div>
            <div>
              <p className="text-heading-3 font-bold text-text-primary">
                {t("home.joinOrCreateDorm")}
              </p>
              <p className="text-body-sm text-text-secondary mt-0.5 leading-snug">
                {t("home.joinOrCreateSub")}
              </p>
            </div>
          </div>

          <Link
            href="/dorm"
            className="btn-primary py-3 px-6 text-body-sm font-bold shrink-0 w-full sm:w-auto text-center shadow-lg shadow-accent-primary/25 relative z-10"
          >
            {t("home.getStarted")} →
          </Link>
        </motion.div>
      )}

      {/* 3. MASTER HERO FINANCIAL POSITION CARD (Breaks the twin-box pattern) */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-[28px] p-6 bg-gradient-to-br from-[#1C1C24] via-[#14141A] to-[#0D0D11] border border-white/[0.08] shadow-[0_16px_36px_rgba(0,0,0,0.6),0_0_28px_rgba(226,54,54,0.06)]"
      >
        {/* Ambient Corner Glow */}
        <div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{
            background: isNetNegative
              ? "var(--accent-coral)"
              : isNetPositive
              ? "var(--accent-teal)"
              : "var(--accent-primary)",
          }}
        />

        {/* Card Header Tag & Status */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: isNetNegative
                  ? "var(--accent-coral)"
                  : isNetPositive
                  ? "var(--accent-teal)"
                  : "var(--accent-teal)",
                boxShadow: isNetNegative
                  ? "0 0 8px var(--accent-coral)"
                  : isNetPositive
                  ? "0 0 8px var(--accent-teal)"
                  : "0 0 8px var(--accent-teal)",
              }}
            />
            <span className="text-[11px] font-bold uppercase tracking-widest text-text-tertiary">
              {t("settle.yourNetBalance")}
            </span>
          </div>

          <span
            className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
            style={{
              background: isNetNegative
                ? "var(--accent-coral-soft)"
                : isNetPositive
                ? "var(--accent-teal-soft)"
                : "var(--accent-teal-soft)",
              color: isNetNegative
                ? "var(--accent-coral)"
                : isNetPositive
                ? "var(--accent-teal)"
                : "var(--accent-teal)",
            }}
          >
            {isNetNegative
              ? "⚠️ May Utang"
              : isNetPositive
              ? "🎉 May Sisingilin"
              : "✨ All Settled"}
          </span>
        </div>

        {/* DOMINANT HERO BALANCE DISPLAY */}
        <div className="my-3">
          <p
            className="text-3xl sm:text-4xl font-black font-mono tracking-tight"
            style={{
              color: isNetNegative
                ? "var(--accent-coral)"
                : isNetPositive
                ? "var(--accent-teal)"
                : "var(--text-primary)",
            }}
          >
            {isNetPositive ? "+" : isNetNegative ? "− " : ""}
            {formatCentavos(Math.abs(myNetBalance))}
          </p>
          <p className="text-body-sm text-text-secondary mt-1">
            {isNetNegative
              ? "May mga naiwang share na kailangang bayaran"
              : isNetPositive
              ? "Kabuuang halagang kailangan mong matanggap mula sa roommates"
              : "Walang pending na bayarin sa kahit sinong roommate"}
          </p>
        </div>

        {/* ASYMMETRIC SUB-BREAKDOWN TRAY */}
        <div className="mt-5 pt-4 border-t border-white/[0.07] grid grid-cols-2 gap-3">
          <Link
            href="/settle"
            className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary flex items-center gap-1">
                <span>↗</span> {t("home.youOwe")}
              </span>
            </div>
            <p
              className="text-heading-3 font-mono font-bold"
              style={{ color: "var(--accent-coral)" }}
            >
              {formatCentavos(youOweCentavos)}
            </p>
          </Link>

          <Link
            href="/settle"
            className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary flex items-center gap-1">
                <span>↙</span> {t("home.owedToYou")}
              </span>
            </div>
            <p
              className="text-heading-3 font-mono font-bold"
              style={{ color: "var(--accent-teal)" }}
            >
              {formatCentavos(owedToYouCentavos)}
            </p>
          </Link>
        </div>

        {/* Quick Settle CTA bar if debts exist */}
        {isNetNegative && (
          <div className="mt-3">
            <Link
              href="/settle"
              className="w-full btn-primary py-2.5 px-4 text-body-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-accent-primary/20"
            >
              <span>💸</span> Settle Debts Now →
            </Link>
          </div>
        )}
      </motion.div>

      {/* 4. Interactive Roommates Rail */}
      {activeDorm && (
        <motion.div variants={itemVariants} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-body-sm font-bold uppercase tracking-wider text-text-secondary">
              {t("dorm.activeMembersTitle", { count: activeMembers.length })}
            </h2>
            <Link
              href="/dorm"
              className="text-caption font-bold text-accent-primary hover:underline"
            >
              {t("home.manageDorm")} →
            </Link>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-none">
            {activeMembers.map((m) => {
              const isMe = m.user_id === user?.id;
              const bal = netBalances.get(m.id) || 0;
              const name =
                m.profile?.display_name?.split(" ")[0] ||
                m.profile?.email?.split("@")[0] ||
                "Roommate";

              return (
                <Link
                  key={m.id}
                  href="/dorm"
                  className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-bg-card border border-white/[0.06] hover:border-accent-primary-border shrink-0 transition-all group"
                >
                  <div className="w-8 h-8 rounded-full bg-accent-primary-soft border border-accent-primary-border text-accent-primary font-bold text-caption flex items-center justify-center uppercase overflow-hidden">
                    {m.profile?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.profile.avatar_url}
                        alt={name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      name.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-body-sm font-semibold text-text-primary leading-tight truncate">
                      {name} {isMe ? `(${t("common.you")})` : ""}
                    </p>
                    <p
                      className="text-caption font-mono font-bold leading-tight"
                      style={{
                        color:
                          bal > 0
                            ? "var(--accent-teal)"
                            : bal < 0
                            ? "var(--accent-coral)"
                            : "var(--text-tertiary)",
                      }}
                    >
                      {bal > 0 ? "+" : ""}
                      {formatCentavos(bal)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* 5. Upcoming Bills Section (Editorial Feed Style) */}
      <motion.div variants={itemVariants} className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-heading-3 font-bold text-text-primary tracking-tight">
              {t("home.upcomingBills")}
            </h2>
            {upcomingBills.length > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-accent-primary-soft text-accent-primary">
                {upcomingBills.length}
              </span>
            )}
          </div>

          <Link
            href="/bills"
            className="text-body-sm font-bold text-accent-primary hover:underline"
          >
            {t("home.viewAll", { count: bills.length })} →
          </Link>
        </div>

        {upcomingBills.length === 0 ? (
          <div className="p-8 rounded-[24px] bg-bg-card/70 border border-white/[0.06] flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center text-2xl mb-3">
              📋
            </div>
            <p className="text-body-md font-semibold text-text-primary">
              {t("home.noUpcomingBills")}
            </p>
            <p className="text-caption text-text-tertiary mt-0.5 max-w-[240px]">
              {t("home.noUpcomingBillsSub")}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcomingBills.map((b) => {
              const isPayer = b.paid_by === user?.id;
              const myShare = b.userShare;
              const isDueSoon =
                new Date(b.due_date).getTime() - Date.now() <
                3 * 24 * 60 * 60 * 1000;

              return (
                <Link
                  key={b.id}
                  href="/bills"
                  className="p-4 rounded-[22px] bg-bg-card hover:bg-bg-elevated border border-white/[0.06] hover:border-accent-primary-border shadow-sm flex items-center justify-between gap-3 transition-all group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-bg-surface border border-white/[0.08] flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                      {b.category?.icon || "📋"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-body-md font-bold text-text-primary truncate">
                        {b.category?.name || "Bill"}
                      </p>
                      <p className="text-caption text-text-tertiary flex items-center gap-1 mt-0.5">
                        <span>Due {b.due_date}</span>
                        {isDueSoon && (
                          <span className="text-accent-coral font-bold ml-1">
                            • Due soon
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-heading-3 font-mono font-bold text-text-primary">
                      {formatCentavos(b.amount_centavos)}
                    </p>
                    {isPayer ? (
                      <span className="text-[11px] font-bold text-accent-teal px-2 py-0.5 rounded-full bg-accent-teal-soft inline-block mt-0.5">
                        {t("bills.youFronted")}
                      </span>
                    ) : myShare ? (
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          myShare.payment_status === "confirmed"
                            ? "bg-accent-teal-soft text-accent-teal"
                            : myShare.payment_status === "paid"
                            ? "bg-accent-amber-soft text-accent-amber"
                            : myShare.payment_status === "acknowledged"
                            ? "bg-accent-primary-soft text-accent-primary"
                            : "bg-accent-coral-soft text-accent-coral"
                        }`}
                      >
                        {myShare.payment_status === "confirmed"
                          ? "✓ Paid"
                          : myShare.payment_status === "paid"
                          ? "⏳ Pending"
                          : `Share: ${formatCentavos(myShare.amount_owed_centavos)}`}
                      </span>
                    ) : (
                      <span className="text-caption text-text-tertiary">
                        Total bill
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* 6. Recent Settle Activity (Timeline Style) */}
      <motion.div variants={itemVariants} className="space-y-3 pb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-heading-3 font-bold text-text-primary tracking-tight">
            {t("home.recentSettleActivity")}
          </h2>
          <Link
            href="/settle"
            className="text-body-sm font-bold text-accent-primary hover:underline"
          >
            {t("home.settleHub")} →
          </Link>
        </div>

        {recentPayments.length === 0 ? (
          <div className="p-8 rounded-[24px] bg-bg-card/70 border border-white/[0.06] flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center text-2xl mb-3">
              ✨
            </div>
            <p className="text-body-md font-semibold text-text-primary">
              {t("home.noRecentSettlements")}
            </p>
            <p className="text-caption text-text-tertiary mt-0.5">
              {t("home.settlementsSub")}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentPayments.map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-[20px] bg-bg-card border border-white/[0.06] flex items-center justify-between gap-3 text-body-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-accent-teal-soft text-accent-teal flex items-center justify-center text-caption font-bold shrink-0">
                    💸
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-text-primary truncate">
                      {p.fromName} → {p.toName}
                    </p>
                    <p className="text-caption text-text-tertiary">
                      {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-mono font-bold text-text-primary">
                    {formatCentavos(p.amount_centavos)}
                  </p>
                  <span className="text-caption text-accent-teal font-semibold">
                    {p.status === "confirmed" ? "✓ Confirmed" : "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

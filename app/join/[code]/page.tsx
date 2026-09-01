"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SPRING } from "@/lib/utils/constants";
import { useAuth } from "@/lib/hooks/useAuth";
import { useDorm } from "@/lib/hooks/useDorm";
import { formatDisplayCode } from "@/lib/utils/invite";
import type { Dorm } from "@/lib/supabase/types";

export default function JoinCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const { user, isLoading: authLoading, signInWithGoogle } = useAuth();
  const { validateInviteCode, joinDormByCode } = useDorm();

  const [dorm, setDorm] = useState<Dorm | null>(null);
  const [moveInDate, setMoveInDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isValidating, setIsValidating] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayCode = formatDisplayCode(code);

  useEffect(() => {
    async function checkInvite() {
      try {
        setIsValidating(true);
        setError(null);
        const res = await validateInviteCode(code);
        if (res.valid && res.dorm) {
          setDorm(res.dorm);
        } else {
          setError(res.error || "This invite code is invalid or expired.");
        }
      } catch {
        setError("Failed to validate invite code.");
      } finally {
        setIsValidating(false);
      }
    }

    checkInvite();
  }, [code, validateInviteCode]);

  const handleJoin = async () => {
    try {
      setIsJoining(true);
      setError(null);
      await joinDormByCode(code, moveInDate);
      router.replace("/dorm");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to join dorm");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-dvh bg-bg-base flex items-center justify-center p-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING.page}
        className="w-full max-w-md card p-8 text-center space-y-6 relative overflow-hidden"
      >
        <div className="w-16 h-16 rounded-3xl bg-accent-primary-soft border border-accent-primary-border flex items-center justify-center text-4xl mx-auto text-accent-primary">
          🏠
        </div>

        <div>
          <p className="text-caption font-semibold text-accent-primary uppercase tracking-widest mb-1">
            Dorm Invitation
          </p>
          <h1 className="text-heading-2 font-bold text-text-primary">
            {isValidating
              ? "Checking invite..."
              : dorm
              ? dorm.name
              : "Invalid Invitation"}
          </h1>
          <p className="text-body-sm text-text-tertiary mt-1">
            Code: <span className="font-mono font-semibold text-accent-primary">{displayCode}</span>
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-accent-coral-soft border border-accent-coral/20 text-accent-coral text-body-sm">
            {error}
          </div>
        )}

        {isValidating ? (
          <div className="py-6 flex justify-center">
            <div className="w-8 h-8 border-3 border-accent-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : dorm ? (
          <div className="space-y-4 text-left">
            <div className="p-4 rounded-2xl bg-bg-surface border border-border-hairline">
              <label className="block text-body-sm font-medium text-text-secondary mb-1.5">
                Your Move-in Date
              </label>
              <input
                type="date"
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-base border border-border-hairline text-text-primary font-mono text-body-sm focus:outline-none focus:border-accent-primary"
                disabled={isJoining}
              />
              <p className="text-caption text-text-tertiary mt-1">
                You will only be billed for cycles active during your stay
              </p>
            </div>

            {!authLoading && !user ? (
              <button
                onClick={signInWithGoogle}
                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2"
              >
                <span>🔑</span> Sign in with Google to Join
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2"
              >
                {isJoining ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Joining {dorm.name}...
                  </>
                ) : (
                  `Join ${dorm.name}`
                )}
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="btn-secondary w-full py-3"
          >
            Go to Hatian Login
          </button>
        )}
      </motion.div>
    </div>
  );
}
/**
 * Hatian Split Engine
 *
 * Pure, integer-centavo arithmetic calculation engine for splitting bills.
 * Guarantees zero float rounding errors and strictly absorbs remainders
 * into the bill creator's share so that sum(shares) === totalAmountCentavos.
 */

export interface SplitParticipant {
  id: string;
  name: string;
  moveInDate?: string;
  moveOutDate?: string | null;
}

export interface CalculatedShare {
  memberId: string;
  amountCentavos: number;
}

export interface SplitOptions {
  method: "prorated_by_days" | "equal" | "percentage" | "custom_amount";
  totalAmountCentavos: number;
  members: SplitParticipant[];
  creatorId: string;
  daysPresent?: Record<string, number>;
  percentages?: Record<string, number>;
  customAmounts?: Record<string, number>;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
}

export interface SplitResult {
  shares: CalculatedShare[];
  totalCentavos: number;
  remainderCentavos: number;
}

/**
 * 1. Equal Split
 * Divides total amount equally among active members.
 * Creator absorbs the integer remainder (1 to N-1 centavos).
 */
export function calculateEqualSplit(
  totalAmountCentavos: number,
  members: SplitParticipant[],
  creatorId: string
): CalculatedShare[] {
  if (members.length === 0) return [];
  if (totalAmountCentavos <= 0) {
    return members.map((m) => ({ memberId: m.id, amountCentavos: 0 }));
  }

  const count = members.length;
  const baseShare = Math.floor(totalAmountCentavos / count);
  const remainder = totalAmountCentavos - baseShare * count;

  return members.map((member) => {
    const isCreator = member.id === creatorId;
    return {
      memberId: member.id,
      amountCentavos: baseShare + (isCreator ? remainder : 0),
    };
  });
}

/**
 * 2. Percentage Split
 * Allocates shares based on percentage weights.
 * Validates sum === 100%. Remainder centavos absorbed by creator.
 */
export function calculatePercentageSplit(
  totalAmountCentavos: number,
  members: SplitParticipant[],
  percentages: Record<string, number>,
  creatorId: string
): CalculatedShare[] {
  if (members.length === 0) return [];

  const totalPercentage = members.reduce(
    (sum, m) => sum + (percentages[m.id] || 0),
    0
  );

  // Validate sum is approximately 100% (allowing small float epsilon)
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error(
      `Percentages must sum to exactly 100% (current sum: ${totalPercentage.toFixed(
        2
      )}%)`
    );
  }

  let allocatedSum = 0;
  const initialShares = members.map((m) => {
    const pct = percentages[m.id] || 0;
    const amount = Math.floor((totalAmountCentavos * pct) / 100);
    allocatedSum += amount;
    return { memberId: m.id, amountCentavos: amount };
  });

  const remainder = totalAmountCentavos - allocatedSum;

  return initialShares.map((share) => ({
    memberId: share.memberId,
    amountCentavos:
      share.amountCentavos +
      (share.memberId === creatorId ? remainder : 0),
  }));
}

/**
 * 3. Custom Amount Split
 * Allocates explicit centavo amounts per member.
 * Validates that sum(customAmounts) === totalAmountCentavos.
 */
export function calculateCustomSplit(
  totalAmountCentavos: number,
  members: SplitParticipant[],
  customAmounts: Record<string, number>
): CalculatedShare[] {
  if (members.length === 0) return [];

  let allocatedSum = 0;
  const shares = members.map((m) => {
    const amt = customAmounts[m.id] || 0;
    allocatedSum += amt;
    return { memberId: m.id, amountCentavos: amt };
  });

  if (allocatedSum !== totalAmountCentavos) {
    const diff = totalAmountCentavos - allocatedSum;
    throw new Error(
      `Custom amounts sum (${(allocatedSum / 100).toFixed(2)}) does not match bill total (${(
        totalAmountCentavos / 100
      ).toFixed(2)}). Difference: ${(diff / 100).toFixed(2)}`
    );
  }

  return shares;
}

/**
 * Calculates number of days between two YYYY-MM-DD date strings inclusive.
 */
export function daysBetween(startStr: string, endStr: string): number {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffTime = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);
}

/**
 * 4. Prorated by Days Present (Hatian Core Calculation)
 * Divides bill proportional to the number of active days each member was present:
 * (personDays / totalPersonDays) * totalAmountCentavos
 * Remainder centavos strictly absorbed by bill creator/payer.
 */
export function calculateProratedSplit(
  totalAmountCentavos: number,
  members: SplitParticipant[],
  periodStart: string,
  periodEnd: string,
  creatorId: string,
  daysPresent?: Record<string, number>
): CalculatedShare[] {
  if (members.length === 0) return [];
  if (totalAmountCentavos <= 0) {
    return members.map((m) => ({ memberId: m.id, amountCentavos: 0 }));
  }

  const pStart = new Date(periodStart).getTime();
  const pEnd = new Date(periodEnd).getTime();
  const defaultCycleDays = daysBetween(periodStart, periodEnd);

  // Compute days present for each member
  const memberDays = members.map((m) => {
    if (daysPresent && typeof daysPresent[m.id] === "number") {
      return { member: m, days: Math.max(0, daysPresent[m.id]) };
    }

    const moveIn = m.moveInDate ? new Date(m.moveInDate).getTime() : pStart;
    const moveOut = m.moveOutDate ? new Date(m.moveOutDate).getTime() : pEnd;

    const effectiveStart = Math.max(pStart, moveIn);
    const effectiveEnd = Math.min(pEnd, moveOut);

    if (effectiveStart > effectiveEnd) {
      return { member: m, days: 0 };
    }

    const diffDays = Math.floor(
      (effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24)
    ) + 1;

    return { member: m, days: Math.max(0, diffDays) };
  });

  const totalPersonDays = memberDays.reduce((sum, md) => sum + md.days, 0);

  if (totalPersonDays === 0) {
    // Fallback to equal split if total person-days is 0
    return calculateEqualSplit(totalAmountCentavos, members, creatorId);
  }

  let allocatedSum = 0;
  const initialShares = memberDays.map((md) => {
    if (md.days === 0) {
      return { memberId: md.member.id, amountCentavos: 0 };
    }
    const share = Math.floor(
      (totalAmountCentavos * md.days) / totalPersonDays
    );
    allocatedSum += share;
    return { memberId: md.member.id, amountCentavos: share };
  });

  const remainder = totalAmountCentavos - allocatedSum;

  return initialShares.map((share) => ({
    memberId: share.memberId,
    amountCentavos:
      share.amountCentavos +
      (share.memberId === creatorId ? remainder : 0),
  }));
}

/**
 * Unified calculation facade
 */
export function calculateSplit(options: SplitOptions): SplitResult {
  const {
    method,
    totalAmountCentavos,
    members,
    creatorId,
    daysPresent = {},
    percentages = {},
    customAmounts = {},
    billingPeriodStart = new Date().toISOString().split("T")[0],
    billingPeriodEnd = new Date().toISOString().split("T")[0],
  } = options;

  let shares: CalculatedShare[] = [];

  switch (method) {
    case "prorated_by_days":
      shares = calculateProratedSplit(
        totalAmountCentavos,
        members,
        billingPeriodStart,
        billingPeriodEnd,
        creatorId,
        daysPresent
      );
      break;
    case "equal":
      shares = calculateEqualSplit(totalAmountCentavos, members, creatorId);
      break;
    case "percentage":
      shares = calculatePercentageSplit(
        totalAmountCentavos,
        members,
        percentages,
        creatorId
      );
      break;
    case "custom_amount":
      shares = calculateCustomSplit(
        totalAmountCentavos,
        members,
        customAmounts
      );
      break;
    default:
      shares = calculateProratedSplit(
        totalAmountCentavos,
        members,
        billingPeriodStart,
        billingPeriodEnd,
        creatorId,
        daysPresent
      );
  }

  const allocatedTotal = shares.reduce((sum, s) => sum + s.amountCentavos, 0);

  return {
    shares,
    totalCentavos: totalAmountCentavos,
    remainderCentavos: totalAmountCentavos - allocatedTotal,
  };
}

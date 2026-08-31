import { describe, it, expect } from "vitest";
import {
  calculateEqualSplit,
  calculatePercentageSplit,
  calculateCustomSplit,
  calculateProratedSplit,
  calculateSplit,
  recalculateSharesFromDaysPresent,
  type SplitParticipant,
} from "@/lib/engine/split";

describe("Hatian Split Engine (TDD)", () => {
  const members: SplitParticipant[] = [
    { id: "user_a", name: "Alice", moveInDate: "2026-01-01" },
    { id: "user_b", name: "Bob", moveInDate: "2026-01-01" },
    { id: "user_c", name: "Charlie", moveInDate: "2026-01-01" },
  ];

  describe("Equal Split", () => {
    it("splits evenly when amount divides perfectly", () => {
      // ₱3,000.00 = 300,000 centavos split among 3 people
      const shares = calculateEqualSplit(300000, members, "user_a");

      expect(shares).toEqual([
        { memberId: "user_a", amountCentavos: 100000 },
        { memberId: "user_b", amountCentavos: 100000 },
        { memberId: "user_c", amountCentavos: 100000 },
      ]);

      const total = shares.reduce((acc, s) => acc + s.amountCentavos, 0);
      expect(total).toBe(300000);
    });

    it("creator absorbs the remainder centavos on uneven division", () => {
      // ₱1,000.00 = 100,000 centavos / 3 = 33,333.333...
      // 100,000 % 3 = 1 centavo remainder
      // Creator (user_a) absorbs the 1 centavo: 33,334 + 33,333 + 33,333 = 100,000
      const shares = calculateEqualSplit(100000, members, "user_a");

      expect(shares).toEqual([
        { memberId: "user_a", amountCentavos: 33334 },
        { memberId: "user_b", amountCentavos: 33333 },
        { memberId: "user_c", amountCentavos: 33333 },
      ]);

      const total = shares.reduce((acc, s) => acc + s.amountCentavos, 0);
      expect(total).toBe(100000);
    });

    it("absorbs 2 centavos remainder when creator is Bob", () => {
      // ₱100.01 = 10,001 centavos / 3 = 3333.666...
      // 10001 % 3 = 2 centavos remainder
      const shares = calculateEqualSplit(10001, members, "user_b");

      expect(shares).toEqual([
        { memberId: "user_a", amountCentavos: 3333 },
        { memberId: "user_b", amountCentavos: 3335 }, // 3333 + 2 remainder
        { memberId: "user_c", amountCentavos: 3333 },
      ]);

      const total = shares.reduce((acc, s) => acc + s.amountCentavos, 0);
      expect(total).toBe(10001);
    });
  });

  describe("Percentage Split", () => {
    it("calculates percentage shares and preserves total centavos", () => {
      // ₱2,500.00 = 250,000 centavos
      // Alice 50%, Bob 30%, Charlie 20%
      const percentages = {
        user_a: 50,
        user_b: 30,
        user_c: 20,
      };

      const shares = calculatePercentageSplit(
        250000,
        members,
        percentages,
        "user_a"
      );

      expect(shares).toEqual([
        { memberId: "user_a", amountCentavos: 125000 },
        { memberId: "user_b", amountCentavos: 75000 },
        { memberId: "user_c", amountCentavos: 50000 },
      ]);

      const total = shares.reduce((acc, s) => acc + s.amountCentavos, 0);
      expect(total).toBe(250000);
    });

    it("throws error if percentages do not sum to 100", () => {
      const invalidPercentages = {
        user_a: 40,
        user_b: 30,
        user_c: 20, // Sum = 90%
      };

      expect(() =>
        calculatePercentageSplit(250000, members, invalidPercentages, "user_a")
      ).toThrowError(/100%/);
    });

    it("absorbs rounding centavos from fractional percentages", () => {
      // ₱100.00 = 10,000 centavos
      // Alice 33.33%, Bob 33.33%, Charlie 33.34%
      const percentages = {
        user_a: 33.33,
        user_b: 33.33,
        user_c: 33.34,
      };

      const shares = calculatePercentageSplit(
        10000,
        members,
        percentages,
        "user_a"
      );

      const total = shares.reduce((acc, s) => acc + s.amountCentavos, 0);
      expect(total).toBe(10000);
    });
  });

  describe("Custom Amount Split", () => {
    it("validates exact custom centavo amounts", () => {
      const customAmounts = {
        user_a: 50000,
        user_b: 30000,
        user_c: 20000,
      };

      const shares = calculateCustomSplit(100000, members, customAmounts);

      expect(shares).toEqual([
        { memberId: "user_a", amountCentavos: 50000 },
        { memberId: "user_b", amountCentavos: 30000 },
        { memberId: "user_c", amountCentavos: 20000 },
      ]);
    });

    it("throws an error if custom amounts do not equal total amount", () => {
      const customAmounts = {
        user_a: 50000,
        user_b: 30000,
        user_c: 15000, // Sum = 95,000 != 100,000
      };

      expect(() =>
        calculateCustomSplit(100000, members, customAmounts)
      ).toThrowError(/does not match/);
    });
  });

  describe("Prorated by Days Present", () => {
    it("prorates based on days present within billing cycle", () => {
      // Billing cycle: 2026-08-01 to 2026-08-31 (31 days total)
      // Alice: moved in 2026-01-01 (present full 31 days)
      // Bob: moved in 2026-08-16 (present 16 days: 16th to 31st inclusive)
      // Charlie: moved out 2026-08-15 (present 15 days: 1st to 15th inclusive)
      const proratedMembers: SplitParticipant[] = [
        { id: "user_a", name: "Alice", moveInDate: "2026-01-01" },
        { id: "user_b", name: "Bob", moveInDate: "2026-08-16" },
        {
          id: "user_c",
          name: "Charlie",
          moveInDate: "2026-01-01",
          moveOutDate: "2026-08-15",
        },
      ];

      // Total bill = ₱6,200.00 = 620,000 centavos
      // Person-days: Alice = 31, Bob = 16, Charlie = 15 -> Total = 62 person-days
      // 620,000 / 62 = 10,000 centavos per day
      // Alice: 31 * 10,000 = 310,000 (₱3,100)
      // Bob: 16 * 10,000 = 160,000 (₱1,600)
      // Charlie: 15 * 10,000 = 150,000 (₱1,500)
      const shares = calculateProratedSplit(
        620000,
        proratedMembers,
        "2026-08-01",
        "2026-08-31",
        "user_a"
      );

      expect(shares).toEqual([
        { memberId: "user_a", amountCentavos: 310000 },
        { memberId: "user_b", amountCentavos: 160000 },
        { memberId: "user_c", amountCentavos: 150000 },
      ]);

      const total = shares.reduce((acc, s) => acc + s.amountCentavos, 0);
      expect(total).toBe(620000);
    });

    it("calculates exact shares from explicit daysPresent entered by roommates", () => {
      // ₱562.00 = 56,200 centavos
      // Alice 30 days, Bob 15 days, Charlie 20 days -> Total = 65 person-days
      const explicitDays = {
        user_a: 30,
        user_b: 15,
        user_c: 20,
      };

      const shares = calculateProratedSplit(
        56200,
        members,
        "2026-03-21",
        "2026-04-20",
        "user_a",
        explicitDays
      );

      // Alice absorbs the 1 centavo remainder: 25,938 + 1 = 25,939
      expect(shares).toEqual([
        { memberId: "user_a", amountCentavos: 25939 },
        { memberId: "user_b", amountCentavos: 12969 },
        { memberId: "user_c", amountCentavos: 17292 },
      ]);

      const total = shares.reduce((acc, s) => acc + s.amountCentavos, 0);
      expect(total).toBe(56200);
    });

    it("assigns 0 share to a member with 0 days present", () => {
      const explicitDays = {
        user_a: 30,
        user_b: 0, // was not at dorm this month
        user_c: 30,
      };

      const shares = calculateProratedSplit(
        60000,
        members,
        "2026-03-21",
        "2026-04-20",
        "user_a",
        explicitDays
      );

      expect(shares).toEqual([
        { memberId: "user_a", amountCentavos: 30000 },
        { memberId: "user_b", amountCentavos: 0 },
        { memberId: "user_c", amountCentavos: 30000 },
      ]);
    });
  });

  describe("Unified calculateSplit facade", () => {
    it("routes equal split correctly", () => {
      const result = calculateSplit({
        method: "equal",
        totalAmountCentavos: 100000,
        members,
        creatorId: "user_a",
      });

      expect(result.shares.length).toBe(3);
      expect(result.totalCentavos).toBe(100000);
    });
  });

  describe("Live Share Recalculation on Days Change (Self-Entry TDD)", () => {
    it("recalculates all roommate shares live when any member edits their days present", () => {
      // ₱562.00 = 56,200 centavos
      // Bill with 3 members: Alice, Bob, Charlie
      const currentShares = [
        { id: "share_1", memberId: "user_a", daysPresent: 15 },
        { id: "share_2", memberId: "user_b", daysPresent: 30 },
        { id: "share_3", memberId: "user_c", daysPresent: 30 },
      ];

      const updated = recalculateSharesFromDaysPresent(
        56200,
        currentShares,
        "user_a"
      );

      // Total days = 75.
      // Alice (15/75) = 11,240 centavos (₱112.40)
      // Bob (30/75) = 22,480 centavos (₱224.80)
      // Charlie (30/75) = 22,480 centavos (₱224.80)
      expect(updated).toEqual([
        { id: "share_1", memberId: "user_a", amountOwedCentavos: 11240, daysPresent: 15 },
        { id: "share_2", memberId: "user_b", amountOwedCentavos: 22480, daysPresent: 30 },
        { id: "share_3", memberId: "user_c", amountOwedCentavos: 22480, daysPresent: 30 },
      ]);

      const sum = updated.reduce((acc, s) => acc + s.amountOwedCentavos, 0);
      expect(sum).toBe(56200);
    });
  });
});

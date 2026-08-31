import { describe, it, expect } from "vitest";
import {
  calculateEqualSplit,
  calculatePercentageSplit,
  calculateCustomSplit,
  calculateProratedSplit,
  calculateSplit,
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

    it("assigns 0 share to a member who moved in after the billing period", () => {
      const futureMember: SplitParticipant[] = [
        { id: "user_a", name: "Alice", moveInDate: "2026-01-01" },
        { id: "user_b", name: "Bob", moveInDate: "2026-09-01" }, // moved in next month
      ];

      const shares = calculateProratedSplit(
        100000,
        futureMember,
        "2026-08-01",
        "2026-08-31",
        "user_a"
      );

      expect(shares).toEqual([
        { memberId: "user_a", amountCentavos: 100000 },
        { memberId: "user_b", amountCentavos: 0 },
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
});

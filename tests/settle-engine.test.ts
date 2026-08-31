import { describe, it, expect } from "vitest";
import {
  calculateNetBalances,
  simplifyDebts,
  type BalanceMember,
  type BillWithShares,
  type SettlementPayment,
} from "@/lib/engine/settle";

describe("Hatian Balance & Settle-Up Engine (TDD)", () => {
  const members: BalanceMember[] = [
    { id: "user_a", name: "Alice" },
    { id: "user_b", name: "Bob" },
    { id: "user_c", name: "Charlie" },
    { id: "user_d", name: "Dave" },
  ];

  describe("Net Balance Calculation", () => {
    it("calculates positive balance for payer and negative for debtors", () => {
      // Alice paid ₱3,000 (300,000 centavos) for an Internet bill
      // Shares: Alice 100,000, Bob 100,000, Charlie 100,000
      const bills: BillWithShares[] = [
        {
          id: "bill_1",
          paidBy: "user_a",
          amountCentavos: 300000,
          shares: [
            { memberId: "user_a", amountOwedCentavos: 100000 },
            { memberId: "user_b", amountOwedCentavos: 100000 },
            { memberId: "user_c", amountOwedCentavos: 100000 },
          ],
        },
      ];

      const balances = calculateNetBalances(members, bills, []);

      // Alice: paid 300,000 - owed 100,000 = +200,000
      // Bob: paid 0 - owed 100,000 = -100,000
      // Charlie: paid 0 - owed 100,000 = -100,000
      // Dave: paid 0 - owed 0 = 0
      expect(balances.get("user_a")).toBe(200000);
      expect(balances.get("user_b")).toBe(-100000);
      expect(balances.get("user_c")).toBe(-100000);
      expect(balances.get("user_d")).toBe(0);
    });

    it("factors in confirmed settlement payments", () => {
      const bills: BillWithShares[] = [
        {
          id: "bill_1",
          paidBy: "user_a",
          amountCentavos: 300000,
          shares: [
            { memberId: "user_a", amountOwedCentavos: 100000 },
            { memberId: "user_b", amountOwedCentavos: 100000 },
            { memberId: "user_c", amountOwedCentavos: 100000 },
          ],
        },
      ];

      // Bob sent ₱1,000 (100,000 centavos) to Alice, and Alice confirmed it
      const payments: SettlementPayment[] = [
        {
          id: "pay_1",
          fromMember: "user_b",
          toMember: "user_a",
          amountCentavos: 100000,
          status: "confirmed",
        },
      ];

      const balances = calculateNetBalances(members, bills, payments);

      // Bob is now fully settled (0)
      expect(balances.get("user_b")).toBe(0);
      // Alice is owed only Charlie's 100,000 (+100,000)
      expect(balances.get("user_a")).toBe(100000);
      expect(balances.get("user_c")).toBe(-100000);
    });

    it("ignores pending (unconfirmed) payments until receiver confirms", () => {
      const bills: BillWithShares[] = [
        {
          id: "bill_1",
          paidBy: "user_a",
          amountCentavos: 100000,
          shares: [
            { memberId: "user_a", amountOwedCentavos: 50000 },
            { memberId: "user_b", amountOwedCentavos: 50000 },
          ],
        },
      ];

      // Bob initiated a payment, but Alice hasn't confirmed yet
      const payments: SettlementPayment[] = [
        {
          id: "pay_1",
          fromMember: "user_b",
          toMember: "user_a",
          amountCentavos: 50000,
          status: "pending",
        },
      ];

      const balances = calculateNetBalances(members, bills, payments);

      // Pending payment does not settle balance until confirmed
      expect(balances.get("user_b")).toBe(-50000);
      expect(balances.get("user_a")).toBe(50000);
    });
  });

  describe("Debt Simplification Algorithm", () => {
    it("simplifies circular debt graph to minimal transactions", () => {
      // Net balances:
      // Alice: -50,000 (owes ₱500)
      // Bob: 0
      // Charlie: +50,000 (owed ₱500)
      const balances = new Map<string, number>([
        ["user_a", -50000],
        ["user_b", 0],
        ["user_c", 50000],
      ]);

      const plan = simplifyDebts(balances);

      expect(plan).toEqual([
        {
          fromMember: "user_a",
          toMember: "user_c",
          amountCentavos: 50000,
        },
      ]);
    });

    it("optimally settles 4 roommates with minimal transactions", () => {
      // Alice: +150,000
      // Bob: +50,000
      // Charlie: -120,000
      // Dave: -80,000
      const balances = new Map<string, number>([
        ["user_a", 150000],
        ["user_b", 50000],
        ["user_c", -120000],
        ["user_d", -80000],
      ]);

      const plan = simplifyDebts(balances);

      // Should produce at most 3 transactions (N-1)
      expect(plan.length).toBeLessThanOrEqual(3);

      // Total money moved should equal total positive balances (200,000)
      const totalTransferred = plan.reduce(
        (acc, p) => acc + p.amountCentavos,
        0
      );
      expect(totalTransferred).toBe(200000);
    });

    it("returns empty array if everyone is already settled", () => {
      const balances = new Map<string, number>([
        ["user_a", 0],
        ["user_b", 0],
        ["user_c", 0],
      ]);

      const plan = simplifyDebts(balances);
      expect(plan).toEqual([]);
    });
  });
});

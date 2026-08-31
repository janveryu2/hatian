import { describe, it, expect } from "vitest";
import {
  calculateNetBalances,
  simplifyDebts,
  redistributeMemberDebt,
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

    it("matches single source of truth for the ₱988.00 bill (15d + 11d)", () => {
      // Water bill: Total = ₱988.00 (98,800 centavos)
      // Fronted by janveryu ("user_a"). Shares: Janver ("user_b") ₱570.00 (57,000), janveryu ₱418.00 (41,800)
      const bills: BillWithShares[] = [
        {
          id: "water_bill",
          paidBy: "user_a",
          amountCentavos: 98800,
          shares: [
            { memberId: "user_a", amountOwedCentavos: 41800 },
            { memberId: "user_b", amountOwedCentavos: 57000 },
          ],
        },
      ];

      const balances = calculateNetBalances(members, bills, []);

      // janveryu fronted 98,800 - own share 41,800 = +57,000 (Owed to You: ₱570.00)
      expect(balances.get("user_a")).toBe(57000);
      // Janver owes 57,000 (You Owe: ₱570.00)
      expect(balances.get("user_b")).toBe(-57000);

      // Verify that Owed to You exactly equals Janver's share
      const owedToYou = balances.get("user_a")!;
      expect(owedToYou).toBe(57000);
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

    it("clears debt when a bill share is marked confirmed", () => {
      const bills: BillWithShares[] = [
        {
          id: "water_bill",
          paidBy: "user_a",
          amountCentavos: 98800,
          shares: [
            { memberId: "user_a", amountOwedCentavos: 41800, paymentStatus: "confirmed" },
            { memberId: "user_b", amountOwedCentavos: 57000, paymentStatus: "confirmed" },
          ],
        },
      ];

      const balances = calculateNetBalances(members, bills, []);

      // Both are settled up (0 balance)!
      expect(balances.get("user_a")).toBe(0);
      expect(balances.get("user_b")).toBe(0);
    });

    it("keeps debt active when a bill share is acknowledged (Pay Later)", () => {
      const bills: BillWithShares[] = [
        {
          id: "water_bill",
          paidBy: "user_a",
          amountCentavos: 98800,
          shares: [
            { memberId: "user_a", amountOwedCentavos: 41800, paymentStatus: "confirmed" },
            { memberId: "user_b", amountOwedCentavos: 57000, paymentStatus: "acknowledged" },
          ],
        },
      ];

      const balances = calculateNetBalances(members, bills, []);

      // Acknowledged is 'Pay Later' -> balance is STILL active!
      expect(balances.get("user_a")).toBe(57000);
      expect(balances.get("user_b")).toBe(-57000);
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

  describe("Member Removal Debt Redistribution", () => {
    it("redistributes departing member debt equally among remaining members", () => {
      // Dave is leaving and owes ₱600 (60,000 centavos)
      // Remaining: Alice (+₱500), Bob (-₱200), Charlie (+₱300)
      const balances = new Map<string, number>([
        ["user_a", 50000],
        ["user_b", -20000],
        ["user_c", 30000],
        ["user_d", -60000],
      ]);

      const updated = redistributeMemberDebt({
        balances,
        departingMemberId: "user_d",
        remainingMemberIds: ["user_a", "user_b", "user_c"],
        adminMemberId: "user_a",
        strategy: "redistribute_equally",
      });

      // Dave is now 0 (debt wiped from dorm ledger)
      expect(updated.get("user_d")).toBe(0);
      // Each remaining member absorbs 60,000 / 3 = 20,000 centavos of debt
      expect(updated.get("user_a")).toBe(30000); // 50,000 - 20,000
      expect(updated.get("user_b")).toBe(-40000); // -20,000 - 20,000
      expect(updated.get("user_c")).toBe(10000); // 30,000 - 20,000

      // Net sum of all balances must still equal 0
      const netSum = Array.from(updated.values()).reduce((a, b) => a + b, 0);
      expect(netSum).toBe(0);
    });

    it("absorbs departing member debt completely by admin", () => {
      const balances = new Map<string, number>([
        ["user_a", 50000], // Admin
        ["user_b", -20000],
        ["user_d", -30000], // Leaving
      ]);

      const updated = redistributeMemberDebt({
        balances,
        departingMemberId: "user_d",
        remainingMemberIds: ["user_a", "user_b"],
        adminMemberId: "user_a",
        strategy: "absorb_by_admin",
      });

      expect(updated.get("user_d")).toBe(0);
      expect(updated.get("user_a")).toBe(20000); // 50,000 - 30,000
      expect(updated.get("user_b")).toBe(-20000); // untouched

      const netSum = Array.from(updated.values()).reduce((a, b) => a + b, 0);
      expect(netSum).toBe(0);
    });

    it("admin absorbs remainder centavos when debt does not divide evenly", () => {
      // Dave owes 10,000 centavos / 3 remaining members = 3,333.33
      // Base share = 3,333, Remainder = 1 centavo
      // Admin (user_a) absorbs 3,334 centavos
      const balances = new Map<string, number>([
        ["user_a", 10000], // Admin
        ["user_b", 0],
        ["user_c", 0],
        ["user_d", -10000], // Leaving
      ]);

      const updated = redistributeMemberDebt({
        balances,
        departingMemberId: "user_d",
        remainingMemberIds: ["user_a", "user_b", "user_c"],
        adminMemberId: "user_a",
        strategy: "redistribute_equally",
      });

      expect(updated.get("user_d")).toBe(0);
      expect(updated.get("user_a")).toBe(10000 - 3334); // 6666
      expect(updated.get("user_b")).toBe(-3333);
      expect(updated.get("user_c")).toBe(-3333);

      const netSum = Array.from(updated.values()).reduce((a, b) => a + b, 0);
      expect(netSum).toBe(0);
    });
  });
});

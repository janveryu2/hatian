/**
 * Hatian Balance & Settle-Up Engine
 *
 * Computes individual net balances across all dorm bills and payments,
 * and executes a debt-simplification greedy min-cash-flow algorithm
 * to minimize the number of settle-up transactions needed.
 */

export interface BalanceMember {
  id: string;
  name: string;
}

export interface BillShareItem {
  memberId: string;
  amountOwedCentavos: number;
  amountPaidCentavos?: number;
  paymentStatus?: string;
}

export interface BillWithShares {
  id: string;
  paidBy: string;
  amountCentavos: number;
  shares: BillShareItem[];
}

export interface SettlementPayment {
  id: string;
  fromMember: string;
  toMember: string;
  amountCentavos: number;
  status: "pending" | "confirmed";
}

export interface SimplifiedTransaction {
  fromMember: string;
  toMember: string;
  amountCentavos: number;
}

/**
 * Computes net balances for all members in a dorm.
 * Positive balance (+) = Owed money (creditor)
 * Negative balance (-) = Owes money (debtor)
 * Zero (0) = Fully settled
 */
export function calculateNetBalances(
  members: BalanceMember[],
  bills: BillWithShares[],
  payments: SettlementPayment[]
): Map<string, number> {
  const balanceMap = new Map<string, number>();

  // Initialize all members with 0 balance
  members.forEach((m) => balanceMap.set(m.id, 0));

  // 1. Process Bills
  for (const bill of bills) {
    // The person who paid the bill gets credited the total bill amount
    const currentPayerBal = balanceMap.get(bill.paidBy) || 0;
    balanceMap.set(bill.paidBy, currentPayerBal + bill.amountCentavos);

    // Each participant owes their respective share
    for (const share of bill.shares) {
      const currentMemberBal = balanceMap.get(share.memberId) || 0;
      balanceMap.set(
        share.memberId,
        currentMemberBal - share.amountOwedCentavos
      );
    }
  }

  // 2. Process Confirmed Payments
  for (const payment of payments) {
    // Only confirmed payments reduce active balances
    if (payment.status === "confirmed") {
      const senderBal = balanceMap.get(payment.fromMember) || 0;
      const receiverBal = balanceMap.get(payment.toMember) || 0;

      // Sender paid money -> increases their balance towards 0
      balanceMap.set(payment.fromMember, senderBal + payment.amountCentavos);
      // Receiver got money -> decreases what is owed to them towards 0
      balanceMap.set(payment.toMember, receiverBal - payment.amountCentavos);
    }
  }

  return balanceMap;
}

/**
 * Debt Simplification Algorithm (Greedy Min-Cash-Flow)
 *
 * Converts arbitrary N-way debt relations into the minimal possible
 * number of pairwise transactions (at most N-1 transactions).
 */
export function simplifyDebts(
  balances: Map<string, number>
): SimplifiedTransaction[] {
  interface Account {
    memberId: string;
    amount: number;
  }

  const debtors: Account[] = [];
  const creditors: Account[] = [];

  // Separate into debtors (<0) and creditors (>0)
  balances.forEach((balance, memberId) => {
    if (balance < -0.01) {
      debtors.push({ memberId, amount: -balance }); // store as positive debt
    } else if (balance > 0.01) {
      creditors.push({ memberId, amount: balance });
    }
  });

  // Sort: biggest debtors and biggest creditors first
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions: SimplifiedTransaction[] = [];

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    // Settle the minimum of what debtor owes and creditor is owed
    const settledAmount = Math.min(debtor.amount, creditor.amount);

    if (settledAmount > 0) {
      transactions.push({
        fromMember: debtor.memberId,
        toMember: creditor.memberId,
        amountCentavos: Math.round(settledAmount),
      });
    }

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    // Move to next debtor if fully settled
    if (debtor.amount <= 0.01) {
      dIdx++;
    }

    // Move to next creditor if fully settled
    if (creditor.amount <= 0.01) {
      cIdx++;
    }
  }

  return transactions;
}

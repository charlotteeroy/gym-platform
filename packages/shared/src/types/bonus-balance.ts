export interface BonusBalanceInfo {
  memberId: string;
  currentBalance: number;
  recentTransactions: BonusBalanceTransactionInfo[];
}

export interface BonusBalanceTransactionInfo {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceType: string | null;
  referenceId: string | null;
  createdBy: string;
  createdAt: string;
}

export interface BonusBalanceHistoryResponse {
  transactions: BonusBalanceTransactionInfo[];
  total: number;
  page: number;
  limit: number;
}

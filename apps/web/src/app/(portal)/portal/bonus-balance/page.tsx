'use client';

import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Transaction {
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

export default function PortalBonusBalancePage() {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/bonus-balance');
      const result = await res.json();
      if (result.success) {
        setBalance(result.data.currentBalance);
        setTransactions(result.data.recentTransactions);
      }
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/portal"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="w-6 h-6" />
          Bonus Balance
        </h1>
        <p className="text-muted-foreground mt-1">Your bonus balance and transaction history</p>
      </div>

      {/* Balance Display */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6 text-center">
        <div className="text-sm text-muted-foreground mb-1">Current Balance</div>
        <div className="text-4xl font-bold">${balance.toFixed(2)}</div>
        <div className="text-sm text-muted-foreground mt-2">Use toward any purchase</div>
      </div>

      {/* Transaction History */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Transaction History</h2>
        </div>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No transactions yet. Purchase a pass to earn bonus balance!
          </div>
        ) : (
          <div className="divide-y">
            {transactions.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  {txn.amount >= 0 ? (
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{txn.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(txn.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <div className={`text-sm font-semibold ${txn.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {txn.amount >= 0 ? '+' : ''}${txn.amount.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">Bal: ${txn.balanceAfter.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

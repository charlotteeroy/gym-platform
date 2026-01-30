'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';

interface Projection {
  period: string;
  expectedTotal: number;
  safe: number;
  atRisk: number;
}

interface RenewalItem {
  date: string;
  memberName: string;
  planName: string;
  amount: number;
  isAtRisk: boolean;
}

interface CashFlowData {
  projections: Projection[];
  renewalCalendar: RenewalItem[];
}

interface CashFlowWidgetProps {
  gymId: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);

const tooltipStyle = {
  borderRadius: '0.75rem',
  border: 'none',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
};

export default function CashFlowWidget({ gymId }: CashFlowWidgetProps) {
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/dashboard/cash-flow')
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success) {
          setData(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-32 bg-slate-200 rounded" />
          <div className="h-48 bg-slate-200 rounded" />
          <div className="h-5 w-40 bg-slate-200 rounded mt-4" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 bg-slate-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const projections = data?.projections ?? [];
  const renewals = (data?.renewalCalendar ?? []).slice(0, 10);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h3 className="font-semibold text-slate-800 mb-4">Cash Flow Projections</h3>

      {/* Stacked Bar Chart */}
      {projections.length > 0 && (
        <div className="mb-6">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={projections}
              margin={{ top: 5, right: 5, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 12, fill: '#475569' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatCurrency(v)}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={65}
              />
              <Tooltip
                formatter={((value: number, name: string) => [
                  formatCurrency(value),
                  name === 'safe' ? 'Safe Revenue' : 'At Risk',
                ]) as any}
                contentStyle={tooltipStyle}
              />
              <Legend
                formatter={(value: string) =>
                  value === 'safe' ? 'Safe Revenue' : 'At Risk'
                }
              />
              <Bar dataKey="safe" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="atRisk" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Upcoming Renewals */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Upcoming Renewals</h4>
        <div className="space-y-2">
          {renewals.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3">
                {item.isAtRisk && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                    At Risk
                  </span>
                )}
                {!item.isAtRisk && (
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium text-slate-800">{item.memberName}</p>
                  <p className="text-xs text-slate-400">{item.planName}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-slate-800">
                  {formatCurrency(item.amount)}
                </p>
                <p className="text-xs text-slate-400">{item.date}</p>
              </div>
            </div>
          ))}

          {renewals.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No upcoming renewals.</p>
          )}
        </div>
      </div>
    </div>
  );
}

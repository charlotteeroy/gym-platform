import { prisma } from '@gym/database';
import Link from 'next/link';
import { TrendingUp, ArrowRight, Sparkles } from 'lucide-react';

interface TopOpportunitiesProps {
  gymId: string;
}

export async function TopOpportunities({ gymId }: TopOpportunitiesProps) {
  const opportunities = await prisma.opportunity.findMany({
    where: {
      gymId,
      status: { in: ['NEW', 'CONTACTED', 'FOLLOW_UP'] },
    },
    include: {
      member: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: [
      { confidence: 'desc' },
      { potentialValue: 'desc' },
    ],
    take: 5,
  });

  if (opportunities.length === 0) {
    return null;
  }

  const totalValue = opportunities.reduce(
    (sum, opp) => sum + Number(opp.potentialValue),
    0
  );

  const confidenceColors = {
    HIGH: 'bg-emerald-100 text-emerald-700',
    MEDIUM: 'bg-amber-100 text-amber-700',
    LOW: 'bg-slate-100 text-slate-600',
  };

  const typeIcons = {
    UPGRADE: '📈',
    PERSONAL_TRAINING: '💪',
    RENEWAL: '🔄',
    ADDON: '➕',
    CROSS_SELL: '🎯',
  };

  const typeLabels = {
    UPGRADE: 'Upgrade',
    PERSONAL_TRAINING: 'PT',
    RENEWAL: 'Renewal',
    ADDON: 'Add-on',
    CROSS_SELL: 'Cross-sell',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Top Opportunities
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">
              ${totalValue.toLocaleString()} potential
            </span>
            <Link
              href="/opportunities"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {opportunities.map((opportunity) => (
          <Link
            key={opportunity.id}
            href={`/members/${opportunity.memberId}`}
            className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-medium text-sm flex-shrink-0">
              {opportunity.member.firstName[0]}
              {opportunity.member.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-900 truncate">
                  {opportunity.member.firstName} {opportunity.member.lastName}
                </p>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${confidenceColors[opportunity.confidence]}`}>
                  {opportunity.confidence}
                </span>
              </div>
              <p className="text-sm text-slate-500 truncate">{opportunity.title}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                <TrendingUp className="w-4 h-4" />
                ${Number(opportunity.potentialValue).toLocaleString()}
              </div>
              <p className="text-xs text-slate-400">
                {typeIcons[opportunity.type]} {typeLabels[opportunity.type]}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

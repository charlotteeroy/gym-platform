import Link from 'next/link';

interface ExpiringSubscriptionsWidgetProps {
  expiringSubscriptions: {
    id: string;
    member: {
      id: string;
      firstName: string;
      lastName: string;
    };
    plan: {
      name: string;
    };
    currentPeriodEnd: string | Date;
  }[];
}

export default function ExpiringSubscriptionsWidget({ expiringSubscriptions }: ExpiringSubscriptionsWidgetProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Expiring This Week
        </h3>
        <Link href="/subscriptions" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          View all
        </Link>
      </div>
      {expiringSubscriptions.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">No subscriptions expiring soon</p>
      ) : (
        <div className="space-y-3">
          {expiringSubscriptions.map((sub) => {
            const daysUntil = Math.ceil((new Date(sub.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return (
              <Link
                key={sub.id}
                href={`/members/${sub.member.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center text-purple-600 font-medium text-sm">
                  {sub.member.firstName[0]}{sub.member.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm">{sub.member.firstName} {sub.member.lastName}</p>
                  <p className="text-xs text-slate-500">{sub.plan.name}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${daysUntil <= 2 ? 'text-red-600' : 'text-amber-600'}`}>
                    {daysUntil}d
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

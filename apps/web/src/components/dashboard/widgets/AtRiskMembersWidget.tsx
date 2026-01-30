import Link from 'next/link';

interface AtRiskMembersWidgetProps {
  atRiskMembers: {
    id: string;
    firstName: string;
    lastName: string;
    daysSinceLastActivity: number;
  }[];
}

export default function AtRiskMembersWidget({ atRiskMembers }: AtRiskMembersWidgetProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          At-Risk Members
        </h3>
        <Link href="/members?activityLevel=declining" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          View all
        </Link>
      </div>
      {atRiskMembers.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">No at-risk members</p>
      ) : (
        <div className="space-y-3">
          {atRiskMembers.map((member) => (
            <Link
              key={member.id}
              href={`/members/${member.id}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-medium text-sm">
                {member.firstName[0]}{member.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm">{member.firstName} {member.lastName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-red-600">{member.daysSinceLastActivity}d</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

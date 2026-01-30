interface HealthScoreWidgetProps {
  health: {
    score: number;
    status: string;
    factors: {
      memberRetention: number;
      subscriptionHealth: number;
      classEngagement: number;
      revenueStability: number;
    };
  };
}

export default function HealthScoreWidget({ health }: HealthScoreWidgetProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800">Business Health</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          health.status === 'healthy' ? 'bg-emerald-100 text-emerald-700' :
          health.status === 'warning' ? 'bg-amber-100 text-amber-700' :
          'bg-red-100 text-red-700'
        }`}>
          {health.status === 'healthy' ? 'Healthy' : health.status === 'warning' ? 'Needs Attention' : 'Critical'}
        </span>
      </div>
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="relative w-28 h-28">
          <svg className="w-28 h-28 transform -rotate-90">
            <circle cx="56" cy="56" r="48" stroke="#e2e8f0" strokeWidth="10" fill="none" />
            <circle
              cx="56" cy="56" r="48"
              stroke={health.status === 'healthy' ? '#10b981' : health.status === 'warning' ? '#f59e0b' : '#ef4444'}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${health.score * 3.02} 302`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold text-slate-900">{health.score}</span>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-4">
          {[
            { name: 'Member Retention', value: health.factors.memberRetention },
            { name: 'Subscriptions', value: health.factors.subscriptionHealth },
            { name: 'Class Engagement', value: health.factors.classEngagement },
            { name: 'Revenue Stability', value: health.factors.revenueStability },
          ].map((factor) => (
            <div key={factor.name} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                factor.value >= 75 ? 'bg-emerald-500' :
                factor.value >= 50 ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              <span className="text-sm text-slate-600">{factor.name}</span>
              <span className="text-sm font-semibold text-slate-900 ml-auto">{factor.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

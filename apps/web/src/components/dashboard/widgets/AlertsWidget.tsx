interface AlertsWidgetProps {
  alerts: {
    severity: string;
    title: string;
    description: string;
  }[];
}

export default function AlertsWidget({ alerts }: AlertsWidgetProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h3 className="font-semibold text-slate-800 mb-4">Alerts</h3>
      <div className="space-y-3">
        {alerts.slice(0, 3).map((alert, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 p-3 rounded-xl ${
              alert.severity === 'critical' ? 'bg-red-50' :
              alert.severity === 'warning' ? 'bg-amber-50' : 'bg-blue-50'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              alert.severity === 'critical' ? 'bg-red-100' :
              alert.severity === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
            }`}>
              <svg className={`w-4 h-4 ${
                alert.severity === 'critical' ? 'text-red-600' :
                alert.severity === 'warning' ? 'text-amber-600' : 'text-blue-600'
              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-900">{alert.title}</p>
              <p className="text-sm text-slate-600">{alert.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

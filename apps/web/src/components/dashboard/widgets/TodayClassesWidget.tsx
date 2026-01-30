import Link from 'next/link';

interface TodayClassesWidgetProps {
  todaysClasses: {
    id: string;
    startTime: string | Date;
    class: {
      name: string;
      capacity: number | null;
      instructor: {
        firstName: string;
        lastName: string;
      } | null;
    };
    _count: {
      bookings: number;
    };
  }[];
}

export default function TodayClassesWidget({ todaysClasses }: TodayClassesWidgetProps) {
  if (todaysClasses.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Today's Classes
        </h3>
        <Link href="/planning" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          View schedule
        </Link>
      </div>
      <div className="space-y-3">
        {todaysClasses.slice(0, 5).map((session) => {
          const capacity = session.class.capacity || 20;
          const booked = session._count.bookings;
          const percentage = Math.round((booked / capacity) * 100);
          const isFull = booked >= capacity;

          return (
            <div key={session.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50">
              <div className="text-center min-w-[60px]">
                <p className="text-sm font-bold text-slate-900">
                  {new Date(session.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900">{session.class.name}</p>
                <p className="text-sm text-slate-500">
                  {session.class.instructor ? `${session.class.instructor.firstName} ${session.class.instructor.lastName}` : 'TBA'}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-medium ${isFull ? 'text-red-600' : percentage >= 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {booked}/{capacity}
                </p>
                <div className="w-16 h-1.5 bg-slate-200 rounded-full mt-1">
                  <div
                    className={`h-full rounded-full ${isFull ? 'bg-red-500' : percentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

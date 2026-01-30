import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Sidebar, MobileHeaderSpacer } from '@/components/layout/sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
        <MobileHeaderSpacer />
      </main>
    </div>
  );
}

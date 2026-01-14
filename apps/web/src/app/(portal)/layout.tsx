import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@gym/database';
import { PortalNav } from '@/components/layout/portal-nav';

async function getMember() {
  const session = await getSession();
  if (!session) return null;

  const member = await prisma.member.findFirst({
    where: { userId: session.user.id },
    include: {
      gym: true,
      subscription: {
        include: { plan: true },
      },
    },
  });

  return member;
}

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await getMember();

  if (!member) {
    redirect('/member-login');
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      <PortalNav
        gymName={member.gym.name}
        memberFirstName={member.firstName}
      />

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {children}
      </main>

      {/* Footer - Hidden on mobile due to bottom nav */}
      <footer className="hidden md:block bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <p className="text-center text-xs sm:text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} {member.gym.name}. Powered by GymPlatform.
          </p>
        </div>
      </footer>
    </div>
  );
}

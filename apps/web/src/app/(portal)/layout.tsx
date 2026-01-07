import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@gym/database';
import Link from 'next/link';
import { Dumbbell, Calendar, CreditCard, User, LogOut, Home } from 'lucide-react';

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

  const navItems = [
    { href: '/portal', icon: Home, label: 'Home' },
    { href: '/portal/classes', icon: Calendar, label: 'Classes' },
    { href: '/portal/bookings', icon: Dumbbell, label: 'My Bookings' },
    { href: '/portal/membership', icon: CreditCard, label: 'Membership' },
    { href: '/portal/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Dumbbell className="h-8 w-8 text-primary" />
              <div>
                <span className="font-bold text-lg">{member.gym.name}</span>
                <span className="text-sm text-muted-foreground ml-2">Member Portal</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {member.firstName}!
              </span>
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} {member.gym.name}. Powered by GymPlatform.
          </p>
        </div>
      </footer>
    </div>
  );
}

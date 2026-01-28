'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dumbbell, Calendar, CreditCard, User, LogOut, Home, Menu, X, ShoppingBag } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PortalNavProps {
  gymName: string;
  memberFirstName: string;
}

export function PortalNav({ gymName, memberFirstName }: PortalNavProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const navItems = [
    { href: '/portal', icon: Home, label: 'Home' },
    { href: '/classes', icon: Calendar, label: 'Classes' },
    { href: '/portal/bookings', icon: Dumbbell, label: 'Bookings' },
    { href: '/portal/membership', icon: CreditCard, label: 'Membership' },
    { href: '/portal/shop', icon: ShoppingBag, label: 'Shop' },
    { href: '/portal/profile', icon: User, label: 'Profile' },
  ];

  const isActive = (href: string) => {
    if (href === '/portal') return pathname === '/portal';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo & Gym Name */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Dumbbell className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <span className="font-bold text-sm sm:text-lg truncate block">{gymName}</span>
                <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">Member Portal</span>
              </div>
            </div>

            {/* Desktop User Info */}
            <div className="hidden md:flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {memberFirstName}!
              </span>
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground min-h-[44px]"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </div>

            {/* Mobile Menu Button */}
            <button
              type="button"
              className="md:hidden p-2 -mr-2 text-gray-500 hover:text-gray-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Desktop Navigation */}
      <nav className="hidden md:block bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 lg:space-x-4 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 py-3 px-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                  isActive(item.href)
                    ? 'text-primary border-primary'
                    : 'text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-300'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Navigation Drawer */}
      <div
        className={cn(
          'md:hidden fixed top-14 right-0 bottom-0 z-50 w-64 bg-white border-l transform transition-transform duration-200',
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Mobile User Info */}
          <div className="p-4 border-b bg-gray-50">
            <p className="text-sm font-medium">Welcome, {memberFirstName}!</p>
            <p className="text-xs text-muted-foreground">{gymName}</p>
          </div>

          {/* Mobile Nav Items */}
          <nav className="flex-1 p-2 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg min-h-[48px] transition-colors',
                  isActive(item.href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Mobile Sign Out */}
          <div className="p-4 border-t">
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg min-h-[48px]"
              >
                <LogOut className="h-5 w-5" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-pb">
        <div className="flex justify-around items-center h-16">
          {navItems.slice(0, 5).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-medium transition-colors',
                isActive(item.href)
                  ? 'text-primary'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span className="truncate max-w-[60px]">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

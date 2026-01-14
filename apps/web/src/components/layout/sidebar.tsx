'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  Settings,
  LogOut,
  Dumbbell,
  Menu,
  X,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Megaphone,
  TrendingUp,
  Shield,
  Building2,
  UserCog,
  Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  children: NavItem[];
}

type NavigationItem = NavItem | NavSection;

function isNavSection(item: NavigationItem): item is NavSection {
  return 'children' in item;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Planning', href: '/dashboard/classes', icon: Calendar },
  {
    name: 'Business',
    icon: Briefcase,
    children: [
      { name: 'Members', href: '/members', icon: Users },
      { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
      { name: 'Opportunities', href: '/opportunities', icon: TrendingUp },
    ],
  },
  {
    name: 'Admin',
    icon: Shield,
    children: [
      { name: 'Gym Profile', href: '/admin/gym', icon: Building2 },
      { name: 'Staff', href: '/admin/staff', icon: UserCog },
      { name: 'Accounting', href: '/admin/accounting', icon: Receipt },
    ],
  },
  { name: 'Subscriptions', href: '/subscriptions', icon: CreditCard },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['Business']);

  // Auto-expand sections based on current path
  useEffect(() => {
    navigation.forEach((item) => {
      if (isNavSection(item)) {
        const isChildActive = item.children.some(
          (child) => pathname === child.href || pathname.startsWith(child.href + '/')
        );
        if (isChildActive && !expandedSections.includes(item.name)) {
          setExpandedSections((prev) => [...prev, item.name]);
        }
      }
    });
  }, [pathname, expandedSections]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const toggleSection = (sectionName: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionName)
        ? prev.filter((name) => name !== sectionName)
        : [...prev, sectionName]
    );
  };

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  const NavLink = ({ item, nested = false }: { item: NavItem; nested?: boolean }) => {
    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
    return (
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all min-h-[44px] md:min-h-[40px]',
          nested && 'pl-11',
          isActive
            ? 'bg-slate-900 text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        )}
        onClick={() => setMobileOpen(false)}
      >
        <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-white' : 'text-slate-400')} />
        <span>{item.name}</span>
      </Link>
    );
  };

  const NavSectionComponent = ({ section }: { section: NavSection }) => {
    const isExpanded = expandedSections.includes(section.name);
    const isAnyChildActive = section.children.some(
      (child) => pathname === child.href || pathname.startsWith(child.href + '/')
    );

    return (
      <div>
        <button
          onClick={() => toggleSection(section.name)}
          className={cn(
            'w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all min-h-[44px] md:min-h-[40px]',
            isAnyChildActive
              ? 'text-slate-900'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          )}
        >
          <div className="flex items-center gap-3">
            <section.icon className={cn('h-5 w-5 flex-shrink-0', isAnyChildActive ? 'text-slate-900' : 'text-slate-400')} />
            <span>{section.name}</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </button>
        {isExpanded && (
          <div className="mt-1 space-y-0.5">
            {section.children.map((child) => (
              <NavLink key={child.name} item={child} nested />
            ))}
          </div>
        )}
      </div>
    );
  };

  const SidebarContent = () => (
    <>
      <div className="flex h-16 items-center gap-3 px-5 border-b border-slate-200/60">
        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
          <Dumbbell className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-lg text-slate-900 tracking-tight">GymFlow</span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) =>
          isNavSection(item) ? (
            <NavSectionComponent key={item.name} section={item} />
          ) : (
            <NavLink key={item.name} item={item} />
          )
        )}
      </nav>

      <div className="border-t border-slate-200/60 p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl min-h-[40px]"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span>Sign out</span>
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur-sm px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
            <Dumbbell className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-base text-slate-900 tracking-tight">GymFlow</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl hover:bg-slate-100"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="h-5 w-5 text-slate-600" /> : <Menu className="h-5 w-5 text-slate-600" />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div
        className={cn(
          'md:hidden fixed top-14 left-0 bottom-0 z-50 w-72 bg-white border-r border-slate-200/60 transform transition-transform duration-200 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          <SidebarContent />
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full w-64 flex-col border-r border-slate-200/60 bg-white">
        <SidebarContent />
      </div>
    </>
  );
}

// Export MobileHeader for use in layout
export function MobileHeaderSpacer() {
  return <div className="h-14 md:hidden" />;
}

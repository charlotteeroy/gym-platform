'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useGymTheme } from '@/components/providers/gym-theme-provider';
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
  Wallet,
  FileText,
  DollarSign,
  PieChart,
  ArrowDownCircle,
  ArrowUpCircle,
  Wrench,
  UserCheck,
  Package,
  Clock,
  Palette,
  ScrollText,
  Tag,
  Calculator,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSubSection {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  children: NavItem[];
}

interface NavSection {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  children: (NavItem | NavSubSection)[];
}

type NavigationItem = NavItem | NavSection;

function isNavSection(item: NavigationItem): item is NavSection {
  return 'children' in item;
}

function isNavSubSection(item: NavItem | NavSubSection): item is NavSubSection {
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
      { name: 'Subscriptions', href: '/subscriptions', icon: CreditCard },
      { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
      { name: 'Opportunities', href: '/opportunities', icon: TrendingUp },
    ],
  },
  {
    name: 'Accounting',
    icon: DollarSign,
    children: [
      { name: 'Overview', href: '/admin/billing', icon: PieChart },
      {
        name: 'Revenue',
        icon: ArrowUpCircle,
        children: [
          { name: 'Payments', href: '/admin/billing/payments', icon: CreditCard },
          { name: 'Invoices', href: '/admin/billing/invoices', icon: FileText },
        ],
      },
      {
        name: 'Expenditure',
        icon: ArrowDownCircle,
        children: [
          { name: 'Operating', href: '/admin/billing/expenses/operating', icon: Wrench },
          { name: 'Staff / Payroll', href: '/admin/billing/expenses/payroll', icon: UserCheck },
          { name: 'Marketing', href: '/admin/billing/expenses/marketing', icon: Megaphone },
          { name: 'Inventory', href: '/admin/billing/expenses/inventory', icon: Package },
        ],
      },
      { name: 'Payouts', href: '/admin/billing/payouts', icon: Wallet },
      { name: 'Tax Report', href: '/admin/billing/tax-report', icon: Calculator },
    ],
  },
  {
    name: 'Admin',
    icon: Shield,
    children: [
      { name: 'Gym Profile', href: '/admin/gym', icon: Building2 },
      { name: 'Opening Hours', href: '/admin/gym/hours', icon: Clock },
      { name: 'Branding', href: '/admin/gym/branding', icon: Palette },
      { name: 'Policies', href: '/admin/gym/policies', icon: ScrollText },
      { name: 'Plans', href: '/admin/plans', icon: Tag },
      { name: 'Staff', href: '/admin/staff', icon: UserCog },
    ],
  },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['Business']);

  // Get gym branding
  const { settings: gymSettings } = useGymTheme();

  // Auto-expand sections based on current path
  useEffect(() => {
    navigation.forEach((item) => {
      if (isNavSection(item)) {
        let isChildActive = false;
        item.children.forEach((child) => {
          if (isNavSubSection(child)) {
            // Check nested subsection children
            const isSubChildActive = child.children.some(
              (subChild) => pathname === subChild.href || pathname.startsWith(subChild.href + '/')
            );
            if (isSubChildActive) {
              isChildActive = true;
              // Also expand the subsection
              if (!expandedSections.includes(`${item.name}/${child.name}`)) {
                setExpandedSections((prev) => [...prev, `${item.name}/${child.name}`]);
              }
            }
          } else {
            if (pathname === child.href || pathname.startsWith(child.href + '/')) {
              isChildActive = true;
            }
          }
        });
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

  const NavLink = ({ item, nested = false, doubleNested = false }: { item: NavItem; nested?: boolean; doubleNested?: boolean }) => {
    // For nested items or specific paths, only match exact path
    // This prevents /admin/billing from matching /admin/billing/payments
    const isActive = pathname === item.href ||
      (item.href !== '/dashboard' &&
       item.href !== '/admin/billing' &&
       pathname.startsWith(item.href + '/'));
    const Icon = item.icon;

    const getPadding = () => {
      if (doubleNested) return '8px 12px 8px 64px';
      if (nested) return '10px 12px 10px 44px';
      return '10px 12px';
    };

    return (
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all min-h-[44px] md:min-h-[40px]',
          nested && 'pl-11',
          doubleNested && 'pl-16',
          isActive
            ? 'bg-slate-900 text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        )}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: getPadding(),
          textDecoration: 'none'
        }}
        onClick={() => setMobileOpen(false)}
      >
        <Icon className={cn(doubleNested ? 'h-4 w-4' : 'h-5 w-5', 'flex-shrink-0', isActive ? 'text-white' : 'text-slate-400')} />
        <span>{item.name}</span>
      </Link>
    );
  };

  const NavSubSectionComponent = ({ subSection, parentName }: { subSection: NavSubSection; parentName: string }) => {
    const sectionKey = `${parentName}/${subSection.name}`;
    const isExpanded = expandedSections.includes(sectionKey);
    const isAnyChildActive = subSection.children.some(
      (child) => pathname === child.href || pathname.startsWith(child.href + '/')
    );
    const Icon = subSection.icon;

    return (
      <div style={{ display: 'block' }}>
        <button
          onClick={() => toggleSection(sectionKey)}
          className={cn(
            'w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all min-h-[40px]',
            isAnyChildActive
              ? 'text-slate-900'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          )}
          style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '8px 12px 8px 44px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Icon className={cn('h-4 w-4 flex-shrink-0', isAnyChildActive ? 'text-slate-700' : 'text-slate-400')} />
            <span>{subSection.name}</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-slate-400" />
          ) : (
            <ChevronRight className="h-3 w-3 text-slate-400" />
          )}
        </button>
        {isExpanded && (
          <div className="mt-1 space-y-0.5" style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
            {subSection.children.map((child) => (
              <NavLink key={child.name} item={child} nested doubleNested />
            ))}
          </div>
        )}
      </div>
    );
  };

  const NavSectionComponent = ({ section }: { section: NavSection }) => {
    const isExpanded = expandedSections.includes(section.name);
    const isAnyChildActive = section.children.some((child) => {
      if (isNavSubSection(child)) {
        return child.children.some(
          (subChild) => pathname === subChild.href || pathname.startsWith(subChild.href + '/')
        );
      }
      return pathname === child.href || pathname.startsWith(child.href + '/');
    });
    const Icon = section.icon;

    return (
      <div style={{ display: 'block' }}>
        <button
          onClick={() => toggleSection(section.name)}
          className={cn(
            'w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all min-h-[44px] md:min-h-[40px]',
            isAnyChildActive
              ? 'text-slate-900'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          )}
          style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Icon className={cn('h-5 w-5 flex-shrink-0', isAnyChildActive ? 'text-slate-900' : 'text-slate-400')} />
            <span>{section.name}</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </button>
        {isExpanded && (
          <div className="mt-1 space-y-0.5" style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
            {section.children.map((child) =>
              isNavSubSection(child) ? (
                <NavSubSectionComponent key={child.name} subSection={child} parentName={section.name} />
              ) : (
                <NavLink key={child.name} item={child} nested />
              )
            )}
          </div>
        )}
      </div>
    );
  };

  const SidebarContent = () => (
    <>
      <div className="flex h-16 items-center gap-3 px-5 border-b border-slate-200/60" style={{ display: 'flex', height: '64px', alignItems: 'center', gap: '12px', padding: '0 20px', borderBottom: '1px solid #e2e8f0' }}>
        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden" style={{ width: '36px', height: '36px', borderRadius: '12px', backgroundColor: gymSettings.logoUrl ? 'transparent' : '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {gymSettings.logoUrl ? (
            <img src={gymSettings.logoUrl} alt={gymSettings.name} className="w-full h-full object-cover" />
          ) : (
            <Dumbbell className="h-5 w-5 text-white" />
          )}
        </div>
        <span className="font-bold text-lg text-slate-900 tracking-tight truncate" style={{ fontWeight: 700, fontSize: '18px', color: '#0f172a' }}>{gymSettings.name}</span>
      </div>

      <nav className="flex-1 space-y-1 p-4 overflow-y-auto" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, padding: '16px' }}>
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
      {/* Mobile Header Bar - only visible on mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-slate-200/60 bg-white/95 backdrop-blur-sm px-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: gymSettings.logoUrl ? 'transparent' : '#0f172a' }}
          >
            {gymSettings.logoUrl ? (
              <img src={gymSettings.logoUrl} alt={gymSettings.name} className="w-full h-full object-cover" />
            ) : (
              <Dumbbell className="h-4 w-4 text-white" />
            )}
          </div>
          <span className="font-bold text-base text-slate-900 tracking-tight truncate">{gymSettings.name}</span>
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

      {/* Mobile Overlay - only on mobile when menu is open */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar Drawer - only on mobile */}
      <div
        className={cn(
          'md:hidden fixed top-14 left-0 bottom-0 z-50 w-72 bg-white border-r border-slate-200/60 transform transition-transform duration-200 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
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
              className="w-full justify-start gap-3 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl min-h-[44px]"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <span>Sign out</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar - hidden on mobile, visible on md+ */}
      <aside className="desktop-sidebar-container h-full w-64 flex-col border-r border-slate-200/60 bg-white">
        <SidebarContent />
      </aside>
    </>
  );
}

// Export MobileHeader for use in layout
export function MobileHeaderSpacer() {
  return <div className="h-14 md:hidden" />;
}

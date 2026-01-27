'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, CSSProperties } from 'react';
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
  Ticket,
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
  type LucideIcon,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────
interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavSubSection {
  name: string;
  icon: LucideIcon;
  children: NavItem[];
}

interface NavSection {
  name: string;
  icon: LucideIcon;
  children: (NavItem | NavSubSection)[];
}

type NavigationItem = NavItem | NavSection;

function isNavSection(item: NavigationItem): item is NavSection {
  return 'children' in item;
}

function isNavSubSection(item: NavItem | NavSubSection): item is NavSubSection {
  return 'children' in item;
}

// ── Colors ─────────────────────────────────────────────
const C = {
  text: '#475569',        // slate-600
  textDark: '#0f172a',    // slate-900
  textLight: '#94a3b8',   // slate-400
  textSub: '#334155',     // slate-700
  white: '#ffffff',
  hoverBg: '#f1f5f9',     // slate-100
  activeBg: '#0f172a',    // slate-900
  border: 'rgba(226,232,240,0.6)',
  overlay: 'rgba(0,0,0,0.5)',
};

// ── Navigation Data ────────────────────────────────────
const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Planning', href: '/dashboard/classes', icon: Calendar },
  {
    name: 'Business',
    icon: Briefcase,
    children: [
      { name: 'Members', href: '/members', icon: Users },
      {
        name: 'Subscriptions',
        icon: CreditCard,
        children: [
          { name: 'Memberships', href: '/subscriptions/memberships', icon: Tag },
          { name: 'Passes', href: '/subscriptions/passes', icon: Ticket },
        ],
      },
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
      { name: 'Staff', href: '/admin/staff', icon: UserCog },
    ],
  },
  { name: 'Settings', href: '/settings', icon: Settings },
];

// ── Component ──────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['Business']);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { settings: gymSettings } = useGymTheme();

  // Auto-expand sections based on current path
  useEffect(() => {
    navigation.forEach((item) => {
      if (isNavSection(item)) {
        let isChildActive = false;
        item.children.forEach((child) => {
          if (isNavSubSection(child)) {
            const isSubChildActive = child.children.some(
              (subChild) => pathname === subChild.href || pathname.startsWith(subChild.href + '/')
            );
            if (isSubChildActive) {
              isChildActive = true;
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

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const toggleSection = (name: string) => {
    setExpandedSections((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  // ── NavLink ──
  const NavLink = ({ item, nested, doubleNested }: { item: NavItem; nested?: boolean; doubleNested?: boolean }) => {
    const isActive = pathname === item.href ||
      (item.href !== '/dashboard' && item.href !== '/admin/billing' && pathname.startsWith(item.href + '/'));
    const Icon = item.icon;
    const hid = `link-${item.href}`;
    const isHovered = hoveredId === hid;

    const paddingLeft = doubleNested ? 64 : nested ? 44 : 12;
    const style: CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: `${doubleNested ? 6 : 8}px 12px`,
      paddingLeft,
      borderRadius: 10,
      fontSize: 14,
      fontWeight: 500,
      textDecoration: 'none',
      minHeight: 36,
      transition: 'background-color 150ms, color 150ms',
      color: isActive ? C.white : isHovered ? C.textDark : C.text,
      backgroundColor: isActive ? C.activeBg : isHovered ? C.hoverBg : 'transparent',
      boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
    };

    return (
      <Link
        href={item.href}
        style={style}
        onMouseEnter={() => setHoveredId(hid)}
        onMouseLeave={() => setHoveredId(null)}
        onClick={() => setMobileOpen(false)}
      >
        <Icon size={doubleNested ? 16 : 20} style={{ flexShrink: 0, color: isActive ? C.white : C.textLight }} />
        <span>{item.name}</span>
      </Link>
    );
  };

  // ── Sub-section button ──
  const NavSubSectionComponent = ({ subSection, parentName }: { subSection: NavSubSection; parentName: string }) => {
    const sectionKey = `${parentName}/${subSection.name}`;
    const isExpanded = expandedSections.includes(sectionKey);
    const isAnyChildActive = subSection.children.some(
      (child) => pathname === child.href || pathname.startsWith(child.href + '/')
    );
    const Icon = subSection.icon;
    const hid = `sub-${sectionKey}`;
    const isHovered = hoveredId === hid;

    const btnStyle: CSSProperties = {
      display: 'flex',
      width: '100%',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '6px 12px 6px 44px',
      borderRadius: 10,
      fontSize: 14,
      fontWeight: 500,
      background: isHovered ? C.hoverBg : 'transparent',
      border: 'none',
      cursor: 'pointer',
      textAlign: 'left' as const,
      transition: 'background-color 150ms, color 150ms',
      color: isAnyChildActive ? C.textDark : isHovered ? C.textDark : C.text,
      minHeight: 36,
    };

    return (
      <div>
        <button
          onClick={() => toggleSection(sectionKey)}
          style={btnStyle}
          onMouseEnter={() => setHoveredId(hid)}
          onMouseLeave={() => setHoveredId(null)}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon size={16} style={{ flexShrink: 0, color: isAnyChildActive ? C.textSub : C.textLight }} />
            <span>{subSection.name}</span>
          </span>
          {isExpanded
            ? <ChevronDown size={12} style={{ color: C.textLight, flexShrink: 0 }} />
            : <ChevronRight size={12} style={{ color: C.textLight, flexShrink: 0 }} />
          }
        </button>
        {isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 1 }}>
            {subSection.children.map((child) => (
              <NavLink key={child.name} item={child} nested doubleNested />
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Section button ──
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
    const hid = `sec-${section.name}`;
    const isHovered = hoveredId === hid;

    const btnStyle: CSSProperties = {
      display: 'flex',
      width: '100%',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '8px 12px',
      borderRadius: 10,
      fontSize: 14,
      fontWeight: 500,
      background: isHovered ? C.hoverBg : 'transparent',
      border: 'none',
      cursor: 'pointer',
      textAlign: 'left' as const,
      transition: 'background-color 150ms, color 150ms',
      color: isAnyChildActive ? C.textDark : isHovered ? C.textDark : C.text,
      minHeight: 36,
    };

    return (
      <div>
        <button
          onClick={() => toggleSection(section.name)}
          style={btnStyle}
          onMouseEnter={() => setHoveredId(hid)}
          onMouseLeave={() => setHoveredId(null)}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon size={20} style={{ flexShrink: 0, color: isAnyChildActive ? C.textDark : C.textLight }} />
            <span>{section.name}</span>
          </span>
          {isExpanded
            ? <ChevronDown size={16} style={{ color: C.textLight, flexShrink: 0 }} />
            : <ChevronRight size={16} style={{ color: C.textLight, flexShrink: 0 }} />
          }
        </button>
        {isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 2 }}>
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

  // ── Navigation list ──
  const NavList = () => (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
      {navigation.map((item) =>
        isNavSection(item) ? (
          <NavSectionComponent key={item.name} section={item} />
        ) : (
          <NavLink key={item.name} item={item} />
        )
      )}
    </nav>
  );

  // ── Sign-out button ──
  const SignOutBtn = () => {
    const hid = 'signout';
    const isHovered = hoveredId === hid;
    return (
      <div style={{ borderTop: `1px solid ${C.border}`, padding: 16 }}>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: '100%',
            padding: '8px 12px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            background: isHovered ? C.hoverBg : 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left' as const,
            color: isHovered ? C.textDark : C.text,
            transition: 'background-color 150ms, color 150ms',
            minHeight: 36,
          }}
          onMouseEnter={() => setHoveredId(hid)}
          onMouseLeave={() => setHoveredId(null)}
        >
          <LogOut size={20} style={{ flexShrink: 0 }} />
          <span>Sign out</span>
        </button>
      </div>
    );
  };

  // ── Gym logo helper ──
  const GymLogo = ({ size }: { size: number }) => (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size > 32 ? 12 : 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: gymSettings.logoUrl ? 'transparent' : C.activeBg,
        flexShrink: 0,
      }}
    >
      {gymSettings.logoUrl ? (
        <img src={gymSettings.logoUrl} alt={gymSettings.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <Dumbbell size={size > 32 ? 20 : 16} style={{ color: C.white }} />
      )}
    </div>
  );

  return (
    <>
      {/* ── Mobile Header Bar ── */}
      <div
        className="md:hidden"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
          display: 'flex', height: 56, alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${C.border}`,
          backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
          padding: '0 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GymLogo size={32} />
          <span style={{ fontWeight: 700, fontSize: 16, color: C.textDark }}>{gymSettings.name}</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          style={{
            width: 40, height: 40, borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', cursor: 'pointer',
          }}
        >
          {mobileOpen ? <X size={20} style={{ color: C.text }} /> : <Menu size={20} style={{ color: C.text }} />}
        </button>
      </div>

      {/* ── Mobile Overlay ── */}
      {mobileOpen && (
        <div
          className="md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
          style={{ position: 'fixed', inset: 0, zIndex: 40, backgroundColor: C.overlay, backdropFilter: 'blur(4px)' }}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <div
        className="md:hidden"
        style={{
          position: 'fixed', top: 56, left: 0, bottom: 0, zIndex: 50,
          width: 288, backgroundColor: C.white, borderRight: `1px solid ${C.border}`,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 200ms ease-in-out',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <NavList />
        <SignOutBtn />
      </div>

      {/* ── Desktop Sidebar ── */}
      <aside
        className="desktop-sidebar-container"
        style={{
          height: '100%', width: 256, flexDirection: 'column', flexShrink: 0,
          borderRight: `1px solid ${C.border}`, backgroundColor: C.white,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', height: 64, alignItems: 'center', gap: 12, padding: '0 20px', borderBottom: `1px solid ${C.border}` }}>
          <GymLogo size={36} />
          <span style={{ fontWeight: 700, fontSize: 18, color: C.textDark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {gymSettings.name}
          </span>
        </div>
        <NavList />
        <SignOutBtn />
      </aside>
    </>
  );
}

export function MobileHeaderSpacer() {
  return <div className="h-14 md:hidden" />;
}

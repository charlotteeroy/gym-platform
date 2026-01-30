'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect, useRef, useCallback, CSSProperties } from 'react';
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
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const sectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const openSection = useCallback((name: string) => {
    if (sectionTimeoutRef.current) clearTimeout(sectionTimeoutRef.current);
    setHoveredSection(name);
  }, []);

  const closeSection = useCallback(() => {
    sectionTimeoutRef.current = setTimeout(() => {
      setHoveredSection(null);
    }, 150);
  }, []);

  const { settings: gymSettings } = useGymTheme();

  // Auto-expand mobile sections based on current path
  useEffect(() => {
    navigation.forEach((item) => {
      if (isNavSection(item)) {
        const isChildActive = item.children.some((child) => {
          if (isNavSubSection(child)) {
            return child.children.some(
              (subChild) => pathname === subChild.href || pathname.startsWith(subChild.href + '/')
            );
          }
          return pathname === child.href || pathname.startsWith(child.href + '/');
        });
        if (isChildActive && !expandedSections.includes(item.name)) {
          setExpandedSections((prev) => [...prev, item.name]);
        }
      }
    });
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Bubble link item (inside popover) ──
  const BubbleLink = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href ||
      (item.href !== '/dashboard' && item.href !== '/admin/billing' && pathname.startsWith(item.href + '/'));
    const Icon = item.icon;
    const hid = `bubble-${item.href}`;
    const isHovered = hoveredId === hid;

    return (
      <Link
        href={item.href}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
          textDecoration: 'none', transition: 'background-color 150ms, color 150ms',
          color: isActive ? C.white : isHovered ? C.textDark : C.text,
          backgroundColor: isActive ? C.activeBg : isHovered ? C.hoverBg : 'transparent',
        }}
        onMouseEnter={() => setHoveredId(hid)}
        onMouseLeave={() => setHoveredId(null)}
        onClick={() => setHoveredSection(null)}
      >
        <Icon size={16} style={{ flexShrink: 0, color: isActive ? C.white : C.textLight }} />
        <span>{item.name}</span>
      </Link>
    );
  };

  // ── Section button with hover bubble ──
  const NavSectionComponent = ({ section }: { section: NavSection }) => {
    const btnRef = useRef<HTMLDivElement>(null);
    const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null);
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
    const isHovered = hoveredId === hid || hoveredSection === section.name;
    const isBubbleOpen = hoveredSection === section.name;

    const handleMouseEnter = () => {
      if (btnRef.current) {
        const rect = btnRef.current.getBoundingClientRect();
        setBubblePos({ top: rect.top, left: rect.right + 8 });
      }
      openSection(section.name);
    };

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

    // Flatten all children for the bubble (including sub-section children)
    const allLinks: { item: NavItem; group?: string }[] = [];
    section.children.forEach((child) => {
      if (isNavSubSection(child)) {
        child.children.forEach((subChild) => {
          allLinks.push({ item: subChild, group: child.name });
        });
      } else {
        allLinks.push({ item: child });
      }
    });

    // Group links by group name
    const groups: { name: string | null; items: NavItem[] }[] = [];
    let currentGroup: { name: string | null; items: NavItem[] } | null = null;
    allLinks.forEach(({ item, group }) => {
      const gName = group || null;
      if (!currentGroup || currentGroup.name !== gName) {
        currentGroup = { name: gName, items: [item] };
        groups.push(currentGroup);
      } else {
        currentGroup.items.push(item);
      }
    });

    return (
      <div
        ref={btnRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={closeSection}
      >
        <button
          style={btnStyle}
          onMouseEnter={() => setHoveredId(hid)}
          onMouseLeave={() => setHoveredId(null)}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon size={20} style={{ flexShrink: 0, color: isAnyChildActive ? C.textDark : C.textLight }} />
            <span>{section.name}</span>
          </span>
          <ChevronRight size={16} style={{ color: C.textLight, flexShrink: 0 }} />
        </button>

        {/* ── Hover Bubble (fixed, not clipped by overflow) ── */}
        {isBubbleOpen && bubblePos && (
          <div
            onMouseEnter={() => openSection(section.name)}
            onMouseLeave={closeSection}
            style={{
              position: 'fixed',
              top: bubblePos.top,
              left: bubblePos.left,
              minWidth: 210,
              backgroundColor: C.white,
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
              padding: '8px 6px',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {/* Section title */}
            <div style={{ padding: '4px 14px 8px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.textLight }}>
              {section.name}
            </div>
            {groups.map((group, gi) => (
              <div key={gi}>
                {group.name && (
                  <div style={{ padding: '6px 14px 2px', fontSize: 11, fontWeight: 600, color: C.textSub, opacity: 0.7 }}>
                    {group.name}
                  </div>
                )}
                {group.items.map((item) => (
                  <BubbleLink key={item.name} item={item} />
                ))}
                {gi < groups.length - 1 && (
                  <div style={{ height: 1, backgroundColor: C.border, margin: '4px 10px' }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Mobile section (click to expand) ──
  const MobileNavSectionComponent = ({ section }: { section: NavSection }) => {
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
      <div>
        <button
          onClick={() => toggleSection(section.name)}
          style={{
            display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, padding: '8px 12px', borderRadius: 10, fontSize: 14, fontWeight: 500,
            background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' as const,
            color: isAnyChildActive ? C.textDark : C.text, minHeight: 36,
          }}
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
            {section.children.map((child) => {
              if (isNavSubSection(child)) {
                return child.children.map((subChild) => (
                  <NavLink key={subChild.name} item={subChild} nested />
                ));
              }
              return <NavLink key={child.name} item={child} nested />;
            })}
          </div>
        )}
      </div>
    );
  };

  // ── Desktop navigation list (hover bubbles) ──
  const NavList = () => (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, padding: '12px 12px' }}>
      {navigation.map((item) =>
        isNavSection(item) ? (
          <NavSectionComponent key={item.name} section={item} />
        ) : (
          <NavLink key={item.name} item={item} />
        )
      )}
    </nav>
  );

  // ── Mobile navigation list (click to expand) ──
  const MobileNavList = () => (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
      {navigation.map((item) =>
        isNavSection(item) ? (
          <MobileNavSectionComponent key={item.name} section={item} />
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
      {/* ── Mobile Bottom Tab Bar ── */}
      <nav
        className="mobile-bottom-bar"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
          height: 64, alignItems: 'stretch', justifyContent: 'space-around',
          borderTop: `1px solid ${C.border}`,
          backgroundColor: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {[
          { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
          { name: 'Planning', href: '/dashboard/classes', icon: Calendar },
          { name: 'Members', href: '/members', icon: Users },
          { name: 'Billing', href: '/admin/billing', icon: DollarSign },
          { name: 'More', href: '#more', icon: Menu },
        ].map((tab) => {
          const isMore = tab.href === '#more';
          const isActive = isMore
            ? mobileOpen
            : tab.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return isMore ? (
            <button
              key={tab.name}
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                flex: 1, gap: 2, background: 'none', border: 'none', cursor: 'pointer',
                color: isActive ? C.activeBg : C.textLight, fontSize: 11, fontWeight: 500,
              }}
            >
              <Icon size={22} />
              <span>{tab.name}</span>
            </button>
          ) : (
            <Link
              key={tab.name}
              href={tab.href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                flex: 1, gap: 2, textDecoration: 'none',
                color: isActive ? C.activeBg : C.textLight, fontSize: 11, fontWeight: 500,
              }}
            >
              <Icon size={22} />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Mobile "More" Overlay ── */}
      {mobileOpen && (
        <div
          className="mobile-drawer"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
          style={{ position: 'fixed', inset: 0, zIndex: 40, backgroundColor: C.overlay, backdropFilter: 'blur(4px)' }}
        />
      )}

      {/* ── Mobile "More" Drawer ── */}
      {mobileOpen && (
        <div
          className="mobile-drawer"
          style={{
            position: 'fixed', left: 0, right: 0, bottom: 64, zIndex: 50,
            maxHeight: '70vh',
            backgroundColor: C.white, borderTop: `1px solid ${C.border}`,
            borderTopLeftRadius: 16, borderTopRightRadius: 16,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#d1d5db' }} />
          </div>
          <MobileNavList />
          <SignOutBtn />
        </div>
      )}

      {/* ── Desktop Sidebar ── */}
      <aside
        className="desktop-sidebar"
        style={{
          position: 'sticky', top: 0, height: '100vh',
          width: 256, flexDirection: 'column', flexShrink: 0,
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
  return <div className="pb-14 md:pb-0" />;
}

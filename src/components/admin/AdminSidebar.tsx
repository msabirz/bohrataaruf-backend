'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShieldCheck, LogOut, Users, UserCog, Mail, Flag, CalendarDays, Share2,
  Settings, SlidersHorizontal, ChevronDown, PanelLeftClose, PanelLeftOpen,
  type LucideIcon,
} from 'lucide-react';
import { AdminSessionPayload } from '@/lib/adminAuth';

interface AdminSidebarProps {
  session: AdminSessionPayload;
  /** Called when a page is chosen, so the phone drawer can close. */
  onNavigate?: () => void;
  /** Desktop only: show just the icons. The phone drawer always shows full labels. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

type Child = { label: string; href: string; /** Custom rule when a plain "starts with" match is not right. */ match?: (path: string) => boolean };
type Item = { label: string; href: string; icon: LucideIcon; match?: (path: string) => boolean; children?: undefined };
type Group = { label: string; icon: LucideIcon; children: Child[]; href?: undefined };
type Entry = Item | Group;

/** To add a page, add a line here: the menu, the active highlight and the collapsed view follow. */
const SECTIONS: { title: string; entries: Entry[] }[] = [
  { title: 'Overview', entries: [{ label: 'Dashboard', href: '/admin', icon: LayoutDashboard }] },
  {
    title: 'People',
    entries: [
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Verifications', href: '/admin/verifications', icon: ShieldCheck },
      { label: 'Volunteers', href: '/admin/volunteers', icon: UserCog },
    ],
  },
  {
    title: 'Programs and sharing',
    entries: [
      {
        label: 'Taaruf Programs',
        icon: CalendarDays,
        children: [
          { label: 'All programs', href: '/admin/programs', match: (p) => p.startsWith('/admin/programs') && p !== '/admin/programs/new' },
          { label: 'New program', href: '/admin/programs/new' },
        ],
      },
      { label: 'Share Profile', href: '/admin/share', icon: Share2 },
    ],
  },
  {
    title: 'Inbox',
    entries: [
      { label: 'Messages', href: '/admin/messages', icon: Mail },
      { label: 'Reports', href: '/admin/reports', icon: Flag },
    ],
  },
  {
    title: 'Setup',
    entries: [
      {
        label: 'Matching setup',
        icon: SlidersHorizontal,
        children: [
          { label: 'Aliases', href: '/admin/alias-frameworks' },
          { label: 'Photo privacy', href: '/admin/photo-privacy-rules' },
          { label: 'Lifestyle traits', href: '/admin/lifestyle-traits' },
        ],
      },
      { label: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];

function isActive(path: string, href: string, match?: (p: string) => boolean) {
  if (match) return match(path);
  return href === '/admin' ? path === href : path === href || path.startsWith(`${href}/`);
}

export default function AdminSidebar({ session, onNavigate, collapsed = false, onToggleCollapsed }: AdminSidebarProps) {
  const pathname = usePathname();
  // A group the user opened or closed by hand. Until then it is open when one of its pages is showing.
  const [manual, setManual] = useState<Record<string, boolean>>({});

  const handleLogout = async () => {
    // Calling a simple API route to clear the cookie (since it's httpOnly)
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  // On a phone the drawer is always full width; "collapsed" only applies from the desktop breakpoint up.
  const hideWhenCollapsed = collapsed ? 'lg:hidden' : '';

  const rowBase = 'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors';
  const rowIdle = 'text-[#F3EFE9]/85 hover:bg-white/10 hover:text-white';
  const rowActive = 'bg-white/15 text-white';
  const rail = (on: boolean) => on && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#E8D3A8]" aria-hidden="true" />;

  return (
    <div
      className={`${collapsed ? 'lg:w-[76px]' : 'lg:w-64'} w-64 max-w-[85vw] bg-[#8C6A3F] flex flex-col text-white shadow-xl h-screen shrink-0 transition-[width] duration-200`}
    >
      {/* Brand + collapse button */}
      <div className={`flex items-center gap-2 border-b border-white/10 px-4 py-4 ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}>
        <div className={`min-w-0 flex-1 ${hideWhenCollapsed}`}>
          <h2 className="truncate text-lg font-extrabold tracking-tight">{process.env.NEXT_PUBLIC_APP_DISPLAY_NAME ?? 'Bohra Taaruf'}</h2>
          <p className="text-[#E8D3A8] text-[10px] font-semibold tracking-widest uppercase">Admin Portal</p>
        </div>
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="hidden shrink-0 rounded-lg p-2 text-[#F3EFE9] hover:bg-white/10 lg:inline-flex"
            aria-label={collapsed ? 'Expand the menu' : 'Collapse the menu'}
            title={collapsed ? 'Expand the menu' : 'Collapse the menu'}
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin">
        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-5 last:mb-0">
            <p className={`mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-[#E8D3A8]/70 ${hideWhenCollapsed}`}>{section.title}</p>
            {collapsed && <div className="mx-3 mb-2 hidden border-t border-white/10 first:hidden lg:block" />}
            <ul className="space-y-0.5">
              {section.entries.map((entry) => {
                const Icon = entry.icon;

                if (!entry.children) {
                  const active = isActive(pathname, entry.href, entry.match);
                  return (
                    <li key={entry.href}>
                      <Link href={entry.href} onClick={onNavigate} title={entry.label} aria-current={active ? 'page' : undefined} className={`${rowBase} ${active ? rowActive : rowIdle} ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
                        {rail(active)}
                        <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-[#E8D3A8]' : 'text-[#E8D3A8]/80'}`} />
                        <span className={`truncate ${hideWhenCollapsed}`}>{entry.label}</span>
                      </Link>
                    </li>
                  );
                }

                const childActive = entry.children.some((c) => isActive(pathname, c.href, c.match));
                const open = manual[entry.label] ?? childActive;
                return (
                  <li key={entry.label}>
                    <button
                      type="button"
                      title={entry.label}
                      aria-expanded={open}
                      onClick={() => {
                        // In the icon-only view there is no room for the sub-menu, so open the full menu first.
                        if (collapsed && onToggleCollapsed) { onToggleCollapsed(); setManual((m) => ({ ...m, [entry.label]: true })); return; }
                        setManual((m) => ({ ...m, [entry.label]: !open }));
                      }}
                      className={`${rowBase} ${childActive && (!open || collapsed) ? rowActive : rowIdle} ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
                    >
                      {rail(childActive && (!open || collapsed))}
                      <Icon className="h-[18px] w-[18px] shrink-0 text-[#E8D3A8]/80" />
                      <span className={`flex-1 truncate text-left ${hideWhenCollapsed}`}>{entry.label}</span>
                      <ChevronDown className={`h-4 w-4 shrink-0 text-[#E8D3A8]/70 transition-transform ${open ? 'rotate-180' : ''} ${hideWhenCollapsed}`} />
                    </button>
                    {open && (
                      <ul className={`mt-0.5 space-y-0.5 border-l border-white/15 ml-[22px] pl-3 ${hideWhenCollapsed}`}>
                        {entry.children.map((c) => {
                          const active = isActive(pathname, c.href, c.match);
                          return (
                            <li key={c.href}>
                              <Link href={c.href} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${active ? 'bg-white/15 font-medium text-white' : 'text-[#F3EFE9]/75 hover:bg-white/10 hover:text-white'}`}>
                                {c.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Session & Logout */}
      <div className="border-t border-white/10 p-3">
        <div className={`flex items-center justify-between gap-2 ${collapsed ? 'lg:flex-col' : ''}`}>
          <div className={`min-w-0 ${hideWhenCollapsed}`}>
            <p className="text-[10px] text-[#E8D3A8]/80 font-medium uppercase tracking-wider">Signed in as</p>
            <p className="truncate text-sm font-semibold">{session.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="shrink-0 rounded-lg p-2 text-white hover:bg-white/10 transition-colors"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

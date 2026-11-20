'use client';

import React, { useCallback, useState, useSyncExternalStore } from 'react';
import { Menu, X } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { AdminSessionPayload } from '@/lib/adminAuth';

const COLLAPSE_KEY = 'admin-sidebar-collapsed';
const COLLAPSE_EVENT = 'admin-sidebar-collapse-change';

// The collapsed choice is remembered in this browser. useSyncExternalStore keeps the first
// (server) render and the browser's first render identical, then switches to the saved value.
function subscribe(callback: () => void) {
  window.addEventListener(COLLAPSE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => { window.removeEventListener(COLLAPSE_EVENT, callback); window.removeEventListener('storage', callback); };
}
function readCollapsed(): boolean {
  try { return window.localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
}

/**
 * The signed-in admin frame. On a computer the sidebar sits beside the page as before. On a
 * phone or small tablet it becomes a drawer: a menu button in the top bar opens it over the
 * page, and choosing a page (or tapping outside) closes it.
 */
export default function AdminShell({ session, appName, children }: { session: AdminSessionPayload; appName: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const toggleCollapsed = useCallback(() => {
    try { window.localStorage.setItem(COLLAPSE_KEY, readCollapsed() ? '0' : '1'); } catch { /* storage blocked: the menu still toggles for this visit */ }
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      {/* Dim the page behind the open drawer; tapping it closes the drawer. */}
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}

      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <AdminSidebar session={session} onNavigate={() => setOpen(false)} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-3 md:px-6 md:py-4 flex items-center gap-3 shadow-sm shrink-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden -ml-1 rounded-lg p-2 text-gray-700 hover:bg-gray-100"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <h1 className="min-w-0 truncate text-base md:text-xl font-bold text-gray-800 tracking-tight">
            {appName} <span className="text-gray-400 font-medium mx-1">|</span> <span className="hidden sm:inline">Volunteer </span>Portal
          </h1>
        </header>
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

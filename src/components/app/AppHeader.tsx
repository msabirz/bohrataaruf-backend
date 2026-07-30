'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, User, Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/discover', label: 'Discover' },
  { href: '/interests', label: 'Interests' },
  { href: '/profile', label: 'Profile' },
  { href: '/settings', label: 'Settings' },
];

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/v1/auth/me').then(r => r.json()).then(d => {
      if (d.photoUri) setPhotoUri(d.photoUri);
    }).catch(() => {});
    fetch('/api/v1/notifications/unread-count').then(r => r.json()).then(d => {
      setUnreadCount(d.count ?? 0);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setIsBellOpen(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setIsAvatarOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleBell = async () => {
    const next = !isBellOpen;
    setIsBellOpen(next);
    if (next && !notificationsLoaded) {
      try {
        const res = await fetch('/api/v1/notifications?limit=8');
        const data = await res.json();
        setNotifications(data.notifications || []);
        setNotificationsLoaded(true);
      } catch {}
    }
  };

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await fetch(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
    } catch {}
  };

  const handleLogout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {NAV_ITEMS.map(item => {
        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`text-sm font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted hover:text-foreground'}`}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <button className="md:hidden text-foreground" onClick={() => setIsMobileNavOpen(true)} aria-label="Open menu">
            <Menu className="w-6 h-6" />
          </button>
          <Link href="/discover" className="font-semibold text-xl tracking-tight text-primary">
            {process.env.NEXT_PUBLIC_APP_DISPLAY_NAME ?? 'Bohra Taaruf'}
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <NavLinks />
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative" ref={bellRef}>
            <button
              onClick={toggleBell}
              className="relative p-2 text-muted hover:text-foreground transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-danger text-surface text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {isBellOpen && (
              <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-surface border border-border rounded-2xl shadow-xl z-50">
                <div className="p-3 border-b border-border text-sm font-semibold text-foreground">Notifications</div>
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted">No notifications yet.</div>
                ) : (
                  <div className="p-1.5">
                    {notifications.map(n => (
                      <button
                        key={n.id}
                        onClick={() => markRead(n.id)}
                        className={`w-full text-left p-3 rounded-xl transition-colors ${n.isRead ? 'hover:bg-background' : 'bg-accent-light/30 hover:bg-accent-light/50'}`}
                      >
                        <p className="text-sm font-medium text-foreground">{n.title}</p>
                        <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.body}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative" ref={avatarRef}>
            <button onClick={() => setIsAvatarOpen(prev => !prev)} className="focus:outline-none">
              <div className="w-10 h-10 rounded-full bg-muted/20 border border-border overflow-hidden flex items-center justify-center shrink-0">
                {photoUri ? (
                  <img src={photoUri} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-muted" />
                )}
              </div>
            </button>
            {isAvatarOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-2xl shadow-xl z-50">
                <div className="p-2 space-y-1">
                  <Link href="/settings" className="block px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent-light/30 rounded-xl transition-colors" onClick={() => setIsAvatarOpen(false)}>
                    Settings
                  </Link>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger/10 rounded-xl transition-colors">
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isMobileNavOpen && (
        <div className="fixed inset-0 z-[100] bg-foreground/20 backdrop-blur-sm md:hidden">
          <div className="bg-surface w-72 h-full p-6 shadow-xl flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-lg text-primary">Menu</span>
              <button onClick={() => setIsMobileNavOpen(false)} aria-label="Close menu">
                <X className="w-6 h-6 text-muted" />
              </button>
            </div>
            <nav className="flex flex-col gap-5">
              <NavLinks onNavigate={() => setIsMobileNavOpen(false)} />
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

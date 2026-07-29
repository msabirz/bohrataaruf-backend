'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, ShieldCheck, LogOut, Users, UserCheck, Mail, Flag } from 'lucide-react';
import { AdminSessionPayload } from '@/lib/adminAuth';

interface AdminSidebarProps {
  session: AdminSessionPayload;
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: LayoutGrid },
  { label: 'Verifications', href: '/admin/verifications', icon: ShieldCheck },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Volunteers', href: '/admin/volunteers', icon: UserCheck },
  { label: 'Messages', href: '/admin/messages', icon: Mail },
  { label: 'Reports', href: '/admin/reports', icon: Flag },
  { label: 'Aliases', href: '/admin/alias-frameworks', icon: LayoutGrid },
];

export default function AdminSidebar({ session }: AdminSidebarProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    // Calling a simple API route to clear the cookie (since it's httpOnly)
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  return (
    <div className="w-64 bg-[#8C6A3F] flex flex-col text-white shadow-xl h-screen sticky top-0 shrink-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#7a5a34] bg-[#826139]">
        <h2 className="text-xl font-extrabold tracking-tight">{process.env.NEXT_PUBLIC_APP_DISPLAY_NAME ?? 'Bohra Taaruf'}</h2>
        <p className="text-[#C9A96E] text-xs font-semibold tracking-widest uppercase mt-1">Admin Portal</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                isActive 
                  ? 'bg-white text-[#8C6A3F] shadow-sm' 
                  : 'text-[#F3EFE9] hover:bg-[#7a5a34] hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#8C6A3F]' : 'text-[#C9A96E]'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Session & Logout */}
      <div className="p-4 border-t border-[#7a5a34] bg-[#7a5a34]/30">
        <div className="flex items-center justify-between">
          <div className="overflow-hidden">
            <p className="text-xs text-[#C9A96E] font-medium uppercase tracking-wider mb-0.5">Logged in as</p>
            <p className="font-semibold truncate text-sm">{session.name}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 bg-[#8C6A3F] hover:bg-[#684c2b] border border-[#684c2b] rounded-lg transition-colors group"
            title="Log Out"
          >
            <LogOut className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

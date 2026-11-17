'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { shareIsNew } from '@/lib/share/newBadge';

const STORAGE_KEY = 'share_announcement_seen_v1';

/**
 * One-time "New: share your biodata" announcement. Remembered in this browser
 * only (a per-viewer convenience), so it shows once per browser and never again
 * after "Maybe later" or "Take me there". Never shows on the Share pages themselves.
 */
export function ShareAnnouncement() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!shareIsNew() || pathname?.startsWith('/share')) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) timer = setTimeout(() => setOpen(true), 1200);
    } catch { /* storage unavailable: just don't show it */ }
    return () => { if (timer) clearTimeout(timer); };
  }, [pathname]);

  const dismiss = () => {
    try { window.localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    setOpen(false);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label="New feature">
      <div className="bg-surface rounded-3xl max-w-sm w-full px-7 py-8 text-center shadow-2xl flex flex-col items-center gap-3">
        <img src="/logo-light.svg" alt="" className="h-14 w-auto" />
        <h2 className="text-2xl font-semibold text-foreground leading-tight" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>New: share your biodata, your way</h2>
        <p className="text-muted leading-relaxed">Choose what to show, make a private link, and switch it off whenever you like.</p>
        <Link href="/share" onClick={dismiss} className="mt-2 w-full py-3 rounded-full bg-primary text-surface font-bold">Take me there</Link>
        <button onClick={dismiss} className="py-2 font-semibold text-primary">Maybe later</button>
      </div>
    </div>
  );
}

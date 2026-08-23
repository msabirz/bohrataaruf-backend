import React from 'react';
import Link from 'next/link';
import { ChevronRight, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';

// Same copy/icon/badge-color mapping as /verification's own STATUS_COPY —
// kept in sync intentionally so this card and the page it links to never
// disagree about what a given status means.
const VERIFICATION_COPY: Record<string, { title: string; badge: string; badgeClass: string; Icon: typeof ShieldCheck }> = {
  verified: { title: 'Your ITS card is verified', badge: 'verified', badgeClass: 'bg-green-100 text-green-800', Icon: ShieldCheck },
  pending: { title: 'Verification in progress', badge: 'pending', badgeClass: 'bg-accent-light text-primary', Icon: ShieldQuestion },
  rejected: { title: 'Verification was not successful', badge: 'rejected', badgeClass: 'bg-red-100 text-red-800', Icon: ShieldAlert },
  none: { title: 'Not yet verified', badge: 'none', badgeClass: 'bg-border text-muted', Icon: ShieldQuestion },
};

export function VerificationStatusCard({ status }: { status: string | undefined }) {
  const s = status && status in VERIFICATION_COPY ? status : 'none';
  const copy = VERIFICATION_COPY[s];
  const Icon = copy.Icon;
  return (
    <Link
      href="/verification"
      className="flex items-center gap-4 bg-surface border border-border rounded-2xl p-5 hover:border-accent transition-colors"
    >
      {/* Icon stays accent gold at every status — only its shape changes
          and only the badge below recolors — matching /verification exactly. */}
      <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center shrink-0">
        <Icon className="w-6 h-6 text-accent" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-foreground">{copy.title}</p>
        <span className={`inline-block mt-1 text-[11px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full ${copy.badgeClass}`}>
          {copy.badge}
        </span>
      </div>
      <ChevronRight className="w-5 h-5 text-muted shrink-0" />
    </Link>
  );
}

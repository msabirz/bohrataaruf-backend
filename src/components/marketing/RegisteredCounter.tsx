'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { HeartHandshake, Check, ArrowRight } from 'lucide-react';
import { MEMBER_MILESTONE_TARGET } from '@/lib/marketingConfig';

export default function RegisteredCounter() {
  const [roundedCount, setRoundedCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/marketing/registered-count')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.roundedCount === 'number') setRoundedCount(data.roundedCount);
      })
      .catch((err) => console.error('Failed to load registered count:', err));
  }, []);

  if (roundedCount === null) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-surface border border-border rounded-3xl p-8 md:p-12 animate-pulse">
        <div className="w-16 h-16 rounded-full bg-border/60 mx-auto mb-5" />
        <div className="h-5 w-2/3 bg-border/60 rounded mx-auto mb-4" />
        <div className="h-4 w-full bg-border/60 rounded mb-2" />
        <div className="h-4 w-5/6 bg-border/60 rounded mx-auto mb-6" />
        <div className="h-12 w-full bg-border/60 rounded-xl" />
      </div>
    );
  }

  const progressPercent = Math.min(100, (roundedCount / MEMBER_MILESTONE_TARGET) * 100);

  return (
    <div className="w-full max-w-4xl mx-auto bg-surface border border-border rounded-3xl p-8 md:p-12 shadow-xl text-center">
      <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center mx-auto mb-5">
        <HeartHandshake className="w-7 h-7 text-primary" />
      </div>

      <span className="inline-flex items-center gap-1.5 bg-background text-[#5C4425] text-xs font-medium px-3 py-1 rounded-full mb-4">
        <Check className="w-3 h-3" />
        An independent initiative, not a business — free, always
      </span>

      <h3 className="text-2xl md:text-3xl font-medium text-foreground mb-3">Be a founding member</h3>

      <p className="text-base text-muted leading-relaxed mb-6">
        Marriage is one of life&apos;s most meaningful moments — it should never come with a price tag.
        Watching this turn into a business, out of reach for many in our community, a fellow momin built
        Bohra Taaruf so every family has free, equal access. No fees, no subscriptions, ever.
      </p>

      {roundedCount > 0 && (
        <div className="mb-6">
          <div className="h-2 w-full bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted mt-2">
            {`Growing every day toward ${MEMBER_MILESTONE_TARGET.toLocaleString()} members`}
          </p>
        </div>
      )}

      <Link
        href="/signup"
        className="w-full inline-flex items-center justify-center gap-2 bg-primary text-surface font-bold py-4 rounded-xl hover:opacity-90 transition-opacity shadow-lg text-lg"
      >
        Register now
        <ArrowRight className="w-5 h-5" />
      </Link>
    </div>
  );
}

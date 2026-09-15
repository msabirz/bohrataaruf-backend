'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, ArrowRight } from 'lucide-react';
import { DateBadge } from './DateBadge';

interface FeaturedProgram {
  id: string;
  title: string;
  slug: string;
  city: string;
  startDate: string;
  endDate: string | null;
}

function formatDateRange(start: string, end: string | null): string {
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  if (!end || end === start) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

// Shared by both homepages (Plan A's page.tsx and Plan B's PreLaunchPage.tsx)
// and the Discover feed's compact highlight box. The ONLY gate for whether a
// program shows here is that program's own admin-set "Feature on Homepage"
// toggle (via GET /api/v1/programs/featured) — entirely independent of
// SITE_MODE, which only decides which homepage renders in the first place.
export function ProgramHomepageBanner({ variant = 'banner' }: { variant?: 'banner' | 'compact' }) {
  const [program, setProgram] = useState<FeaturedProgram | null | undefined>(undefined);

  useEffect(() => {
    fetch('/api/v1/programs/featured')
      .then((r) => r.json())
      .then((d) => setProgram(d.program ?? null))
      .catch(() => setProgram(null));
  }, []);

  if (!program) return null; // still loading, or nothing is featured — render nothing either way

  if (variant === 'compact') {
    return (
      <Link
        href={`/events/${program.slug}`}
        className="mb-6 flex items-center gap-3.5 rounded-2xl border border-accent/30 bg-accent-light/30 px-4 py-3 hover:border-accent/60 transition-colors"
      >
        <DateBadge date={program.startDate} />
        <div className="min-w-0 flex-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">Taaruf Program</span>
          <p className="text-sm font-medium text-foreground truncate">
            {program.title} · {program.city}
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-primary shrink-0" />
      </Link>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-6">
      <Link
        href={`/events/${program.slug}`}
        className="group flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 rounded-2xl border border-accent/30 bg-accent-light/30 px-6 py-5 hover:border-accent/60 hover:shadow-sm transition-all"
      >
        <DateBadge date={program.startDate} size="lg" />
        <div className="flex-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">Upcoming Taaruf Program</span>
          <h3 className="text-lg font-bold text-foreground mt-0.5">{program.title}</h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted mt-1">
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{program.city}</span>
            <span>{formatDateRange(program.startDate, program.endDate)}</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-medium bg-primary text-surface px-5 py-2.5 rounded-full group-hover:bg-primary/90 transition-colors shrink-0">
          View & apply <ArrowRight className="w-4 h-4" />
        </span>
      </Link>
    </div>
  );
}

import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Calendar as CalendarIcon, ArrowRight, Users as UsersIcon } from 'lucide-react';
import { db } from '@/lib/db';
import { taarufPrograms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { breadcrumbJsonLd } from '@/lib/seo';
import { DateBadge } from '@/components/marketing/DateBadge';

const APP_NAME = process.env.APP_DISPLAY_NAME ?? 'Bohra Taaruf';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `Taaruf Programs | ${APP_NAME}`,
  description: `In-person community gatherings organized by ${APP_NAME} where verified members can meet face to face, in a respectful and supervised setting.`,
};

function formatDateRange(start: string, end: string | null): string {
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  if (!end || end === start) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

export default async function EventsHubPage() {
  const programs = await db.select().from(taarufPrograms)
    .where(eq(taarufPrograms.status, 'published'))
    .orderBy(taarufPrograms.startDate);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = programs.filter(p => p.startDate >= today);
  const past = programs.filter(p => p.startDate < today);

  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Taaruf Programs', path: '/events' },
  ]);

  return (
    <div className="bg-background min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      {/* Hero — same bronze dot-matrix treatment as the homepage hero, so
          this reads as part of the same site rather than a bolted-on page. */}
      <section className="relative pt-28 md:pt-32 pb-16 overflow-hidden px-6">
        <div
          className="absolute inset-0 -z-10 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #C9A96E 1px, transparent 0)',
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(circle at top center, black 0%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(circle at top center, black 0%, transparent 80%)',
          }}
        />
        <div className="container mx-auto max-w-4xl">
          <span className="inline-block py-1 px-3 rounded-full bg-accent-light/50 text-primary font-medium text-sm mb-5 border border-accent/20">
            In person, not just in the app
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight text-balance">
            Taaruf Programs
          </h1>
          <p className="text-lg text-muted max-w-2xl leading-relaxed">
            Community-organized gatherings in cities across our jamaat — a chance to meet face to face, in a respectful
            and supervised setting, alongside everything {APP_NAME} already offers online.
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-6 pb-32">
        <h2 className="text-xl font-bold text-foreground mb-6">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="bg-surface border border-dashed border-border rounded-2xl py-16 text-center mb-16">
            <CalendarIcon className="w-8 h-8 text-muted/50 mx-auto mb-3" />
            <p className="text-muted">No programs are open for registration right now. Check back soon.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5 mb-16">
            {upcoming.map((program) => (
              <Link
                key={program.id}
                href={`/events/${program.slug}`}
                className="group flex gap-4 bg-surface border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                <DateBadge date={program.startDate} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-foreground mb-1.5 leading-snug">{program.title}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-muted mb-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{program.city}{program.venueName ? ` · ${program.venueName}` : ''}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs font-medium text-primary bg-accent-light/40 rounded-full px-2.5 py-1">
                      {program.feeAmount ? `₹${program.feeAmount} on selection` : 'No fee'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {past.length > 0 && (
          <>
            <h2 className="text-xl font-bold text-foreground mb-6">Past programs</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {past.map((program) => (
                <div key={program.id} className="flex gap-4 bg-surface border border-border rounded-2xl p-5 opacity-60">
                  <DateBadge date={program.startDate} />
                  <div className="min-w-0">
                    <h3 className="font-bold text-foreground mb-1.5 leading-snug">{program.title}</h3>
                    <div className="flex items-center gap-1.5 text-sm text-muted">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{program.city}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

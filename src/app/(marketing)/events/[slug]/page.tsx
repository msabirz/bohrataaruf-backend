import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft, MapPin, Calendar as CalendarIcon, Users as UsersIcon, Heart, Clock,
} from 'lucide-react';
import { db } from '@/lib/db';
import { taarufPrograms, taarufProgramApplications } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getAuthenticatedUserFromCookie } from '@/lib/api/pageAuth';
import { isValidFormSchema } from '@/lib/programFormSchema';
import { ProgramApplyForm } from '@/components/marketing/ProgramApplyForm';
import { DateBadge } from '@/components/marketing/DateBadge';
import { breadcrumbJsonLd } from '@/lib/seo';

const APP_NAME = process.env.APP_DISPLAY_NAME ?? 'Bohra Taaruf';

export const dynamic = 'force-dynamic';

function formatDateRange(start: string, end: string | null): string {
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  if (!end || end === start) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

async function getProgram(slug: string) {
  const program = await db.select().from(taarufPrograms).where(eq(taarufPrograms.slug, slug)).limit(1).then(r => r[0]);
  if (!program || program.status !== 'published') return null;
  return program;
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const program = await getProgram(slug);
  if (!program) return { title: `Taaruf Program | ${APP_NAME}` };
  return {
    title: `${program.title} | ${APP_NAME}`,
    description: program.description || `A Taaruf program in ${program.city}, organized by ${APP_NAME}.`,
  };
}

export default async function ProgramDetailPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const program = await getProgram(slug);
  if (!program) return notFound();

  const user = await getAuthenticatedUserFromCookie();
  let myApplication: { status: string; passCode: string | null } | null = null;
  if (user) {
    myApplication = await db.select({ status: taarufProgramApplications.status, passCode: taarufProgramApplications.passCode })
      .from(taarufProgramApplications)
      .where(and(eq(taarufProgramApplications.programId, program.id), eq(taarufProgramApplications.userId, user.id)))
      .limit(1)
      .then(r => r[0] ?? null);
  }

  const fields = isValidFormSchema(program.formSchema) ? program.formSchema : [];

  const eventJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: program.title,
    description: program.description || undefined,
    startDate: program.startDate,
    endDate: program.endDate || program.startDate,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: program.venueName || program.city,
      address: { '@type': 'PostalAddress', addressLocality: program.city, addressCountry: 'IN' },
    },
    organizer: { '@type': 'Organization', name: APP_NAME, url: 'https://bohrataaruf.com' },
  };

  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Taaruf Programs', path: '/events' },
    { name: program.title, path: `/events/${program.slug}` },
  ]);

  const ageRange = program.ageMinMale && program.ageMinFemale
    ? `${Math.min(program.ageMinMale, program.ageMinFemale)}–${Math.max(program.ageMaxMale ?? 0, program.ageMaxFemale ?? 0)}`
    : null;

  return (
    <div className="bg-background min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      {/* Hero */}
      <section className="relative pt-28 md:pt-32 pb-12 overflow-hidden px-6">
        <div
          className="absolute inset-0 -z-10 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #C9A96E 1px, transparent 0)',
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(circle at top center, black 0%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(circle at top center, black 0%, transparent 80%)',
          }}
        />
        <div className="container mx-auto max-w-5xl">
          <Link href="/events" className="text-sm font-medium text-muted hover:text-foreground inline-flex items-center gap-1.5 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> All Taaruf Programs
          </Link>

          <div className="flex items-start gap-5">
            <DateBadge date={program.startDate} size="lg" />
            <div className="min-w-0">
              <span className="inline-block text-xs font-semibold uppercase tracking-wide text-primary mb-2">Taaruf Program</span>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 leading-tight text-balance">{program.title}</h1>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted">
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary/70" />{program.city}{program.venueName ? ` · ${program.venueName}` : ''}</span>
                <span className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4 text-primary/70" />{formatDateRange(program.startDate, program.endDate)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-5xl px-6 pb-32">
        <div className="grid lg:grid-cols-[1fr_360px] gap-10 items-start">
          {/* Content column */}
          <div>
            {/* Key facts tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
              <div className="bg-surface border border-border rounded-xl p-4">
                <Heart className="w-4 h-4 text-primary mb-2" />
                <p className="text-sm font-bold text-foreground">{program.feeAmount ? `₹${program.feeAmount}` : 'Free'}</p>
                <p className="text-xs text-muted">on selection</p>
              </div>
              {program.capacity != null && (
                <div className="bg-surface border border-border rounded-xl p-4">
                  <UsersIcon className="w-4 h-4 text-primary mb-2" />
                  <p className="text-sm font-bold text-foreground">{program.capacity}</p>
                  <p className="text-xs text-muted">seats</p>
                </div>
              )}
              {ageRange && (
                <div className="bg-surface border border-border rounded-xl p-4">
                  <UsersIcon className="w-4 h-4 text-primary mb-2" />
                  <p className="text-sm font-bold text-foreground">{ageRange}</p>
                  <p className="text-xs text-muted">age range</p>
                </div>
              )}
              {program.registrationDeadline && (
                <div className="bg-surface border border-border rounded-xl p-4">
                  <Clock className="w-4 h-4 text-primary mb-2" />
                  <p className="text-sm font-bold text-foreground">
                    {new Date(program.registrationDeadline).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-xs text-muted">registration closes</p>
                </div>
              )}
            </div>

            {program.description && (
              <div className="mb-10">
                <h2 className="text-lg font-bold text-foreground mb-3">About this program</h2>
                <p className="text-foreground/90 leading-relaxed whitespace-pre-line">{program.description}</p>
              </div>
            )}

          </div>

          {/* Apply sidebar — stacks below the content on mobile (default grid
              flow, single column) and becomes a sticky right rail at lg. One
              instance only, so there's never a second copy of its form state. */}
          <div className="lg:sticky lg:top-28">
            <ProgramApplyForm
              programId={program.id}
              slug={program.slug}
              fields={fields}
              isAuthenticated={!!user}
              initialApplication={myApplication}
              feeAmount={program.feeAmount}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

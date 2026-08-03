import { db } from '@/lib/db';
import { biodataLinks, biodataLinkHistory, users, profiles, preferences } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { createHash } from 'crypto';
import { fetchAndBlurPhoto } from '@/lib/blurPhoto';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { Briefcase, GraduationCap, Heart, MapPin, Users, Home, Activity } from 'lucide-react';

// ── Bot / crawler detection ─────────────────────────────────────────────────
const BOT_UA_PATTERNS = [
  /whatsapp/i,
  /telegrambot/i,
  /twitterbot/i,
  /facebookexternalhit/i,
  /linkedinbot/i,
  /discordbot/i,
  /slackbot/i,
  /googlebot/i,
  /bingbot/i,
  /applebot/i,
  /ia_archiver/i,
  /preview/i,
];

function isBot(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return BOT_UA_PATTERNS.some((p) => p.test(ua));
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function getClientIp(headerStore: Awaited<ReturnType<typeof headers>>): string {
  return (
    headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headerStore.get('x-real-ip') ??
    'unknown'
  );
}

// ── Fetch the user's public profile fields ─────────────────────────────────
async function getPublicProfile(userId: string) {
  const rows = await db
    .select({
      name: users.name,
      dateOfBirth: users.dateOfBirth,
      city: users.city,
      jamaat: users.jamaat,
      education: profiles.education,
      fieldOfStudy: profiles.fieldOfStudy,
      profession: profiles.profession,
      maritalStatus: profiles.maritalStatus,
      willingToRelocate: profiles.willingToRelocate,
      bioText: profiles.bioText,
      introLine: profiles.introLine,
      photoKey: profiles.photoKey,
      brothersCount: profiles.brothersCount,
      brothersMarriedCount: profiles.brothersMarriedCount,
      sistersCount: profiles.sistersCount,
      sistersMarriedCount: profiles.sistersMarriedCount,
      hasChildren: profiles.hasChildren,
      childrenCount: profiles.childrenCount,
      childrenBoysCount: profiles.childrenBoysCount,
      childrenGirlsCount: profiles.childrenGirlsCount,
      childrenLivingStatus: profiles.childrenLivingStatus,
      familyExpectation: preferences.familyExpectation,
      practiceLevel: preferences.practiceLevel,
    })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .leftJoin(preferences, eq(preferences.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  return rows[0] ?? null;
}

function computeAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

function formatEnum(val?: string | null) {
  if (!val) return '';
  return val.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

// ── Page component ─────────────────────────────────────────────────────────
export default async function BiodataPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const headerStore = await headers();
  const userAgent = headerStore.get('user-agent');
  const tokenHash = hashToken(token);
  const botRequest = isBot(userAgent);

  let userId: string | null = null;
  let expired = false;

  if (botRequest) {
    // ── BOT: peek at the link without consuming it ────────────────────────
    const row = await db
      .select({ userId: biodataLinks.userId, expiresAt: biodataLinks.expiresAt })
      .from(biodataLinks)
      .where(eq(biodataLinks.token, token))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!row || row.expiresAt < new Date()) {
      return <ExpiredPage />;
    }
    userId = row.userId;
  } else {
    // ── REAL USER: atomic claim (DELETE ... RETURNING) ────────────────────
    const claimed: any = await db.execute(sql`
      DELETE FROM biodata_links
      WHERE token = ${token}
        AND expires_at > now()
      RETURNING user_id, expires_at
    `);
    const claimedRow = (claimed?.rows ?? claimed)?.[0];

    if (!claimedRow) {
      const historyRow = await db
        .select({ outcome: biodataLinkHistory.outcome })
        .from(biodataLinkHistory)
        .where(eq(biodataLinkHistory.tokenHash, tokenHash))
        .limit(1)
        .then((r) => r[0] ?? null);

      if (historyRow?.outcome === 'pending') {
        db.execute(sql`
          UPDATE biodata_link_history
          SET outcome = 'expired_unviewed'
          WHERE token_hash = ${tokenHash} AND outcome = 'pending'
        `).catch((e) => console.warn('[biodata/page] expired_unviewed update failed:', e));
      }

      return <ExpiredPage />;
    }

    userId = claimedRow.user_id;
    const clientIp = getClientIp(headerStore);

    db.execute(sql`
      UPDATE biodata_link_history
      SET viewed_at = now(),
          viewer_ip = ${clientIp},
          outcome = 'viewed'
      WHERE token_hash = ${tokenHash} AND outcome = 'pending'
    `).catch((e) => console.warn('[biodata/page] History update failed (non-blocking):', e));
  }

  // ── Fetch profile data ────────────────────────────────────────────────────
  const profile = userId ? await getPublicProfile(userId) : null;
  if (!profile) return notFound();

  const age = computeAge(profile.dateOfBirth);
  const blurredPhotoDataUri = await fetchAndBlurPhoto(profile.photoKey);

  const displayName = profile.name;
  const description = `${age !== null ? `${age} years old · ` : ''}${profile.city}${profile.education ? ` · ${profile.education}` : ''}${profile.profession ? ` · ${profile.profession}` : ''}`;

  return (
    <>
      <title>{displayName} — Biodata</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={`${displayName} — Biodata`} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="profile" />
      {blurredPhotoDataUri && (
        <meta property="og:image" content={blurredPhotoDataUri} />
      )}
      <meta name="robots" content="noindex, nofollow" />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-section {
          opacity: 0;
          animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media (min-width: 600px) {
          .details-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-section {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }
        @media print {
          .no-print { display: none !important; }
          .animate-section { animation: none !important; opacity: 1 !important; transform: none !important; }
          .print-card { box-shadow: none !important; border: 1px solid #ddd !important; margin-bottom: 20px !important; page-break-inside: avoid; }
          body { background: #fff !important; }
        }
      `}} />

      <div style={{ minHeight: '100vh', margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#F8F5F0', color: '#1a1a1a' }}>
        
        {/* Full-bleed Banner */}
        <div className="no-print" style={{
          height: 120,
          width: '100%',
          backgroundColor: '#F8F5F0',
          backgroundImage: 'radial-gradient(circle at 1px 1px, #C9A96E 1.5px, transparent 0)',
          backgroundSize: '24px 24px',
          maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
        }} />

        {/* Centered Content Container */}
        <main style={{ maxWidth: 768, margin: '0 auto', padding: '0 20px 80px', position: 'relative' }}>
          
          {/* Unified Card */}
          <div className="animate-section print-card" style={{
            background: '#fff', 
            borderRadius: 16, 
            padding: '0 24px 32px',
            marginTop: '-60px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            animationDelay: '0ms'
          }}>
            
            {/* HERO SECTION */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              {/* Photo Overlap */}
              <div style={{
                width: 120, height: 120, 
                borderRadius: '50%', 
                background: '#fff',
                marginTop: '-60px',
                border: '5px solid #fff',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                marginBottom: 16
              }}>
                {blurredPhotoDataUri ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={blurredPhotoDataUri}
                    alt="Profile photo"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: '100%', background: '#F8F5F0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 48, color: '#8C6A3F', fontWeight: 600
                  }}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Identity */}
              <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.5px' }}>
                {displayName}
              </h1>
              {profile.introLine && (
                <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 500, color: '#333', lineHeight: 1.3 }}>
                  {profile.introLine.replace(/^"|"$/g, '')}
                </p>
              )}
              <p style={{ margin: 0, fontSize: 14, color: '#666' }}>
                {age !== null ? `${age} years old · ` : ''}{profile.city}
              </p>
            </div>

            {/* ABOUT SECTION (Omitted entirely if null) */}
            {profile.bioText && (
              <>
                <div style={{ height: 1, background: '#f0ece7', margin: '24px 0' }} className="no-print" />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#8C6A3F', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                    About
                  </div>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: '#444' }}>
                    {profile.bioText}
                  </p>
                </div>
              </>
            )}

            {/* DETAILS SECTION */}
            {/* Include a divider before details if either bio or hero exists. We always have a hero, so divider always renders before grid */}
            <div style={{ height: 1, background: '#f0ece7', margin: '24px 0' }} className="no-print" />
            <div className="details-grid">
              
              {profile.profession && (
                <DetailTile icon={<Briefcase size={16} color="#8C6A3F" strokeWidth={2} />} label="Profession" value={profile.profession} />
              )}
              {profile.education && (
                <DetailTile icon={<GraduationCap size={16} color="#8C6A3F" strokeWidth={2} />} label="Education" value={`${profile.education}${profile.fieldOfStudy ? ` in ${profile.fieldOfStudy}` : ''}`} />
              )}
              {profile.maritalStatus && (
                <DetailTile icon={<Heart size={16} color="#8C6A3F" strokeWidth={2} />} label="Marital Status" value={formatEnum(profile.maritalStatus)} />
              )}
              {profile.willingToRelocate && (
                <DetailTile icon={<MapPin size={16} color="#8C6A3F" strokeWidth={2} />} label="Relocate" value={formatEnum(profile.willingToRelocate)} />
              )}
              {profile.jamaat && (
                <DetailTile icon={<Users size={16} color="#8C6A3F" strokeWidth={2} />} label="Jamaat" value={profile.jamaat} />
              )}
              {profile.familyExpectation && (
                <DetailTile icon={<Home size={16} color="#8C6A3F" strokeWidth={2} />} label="Family Setup" value={formatEnum(profile.familyExpectation)} />
              )}
              {profile.practiceLevel && (
                <DetailTile icon={<Activity size={16} color="#8C6A3F" strokeWidth={2} />} label="Practice Level" value={formatEnum(profile.practiceLevel)} />
              )}
              {((profile.brothersCount ?? 0) > 0 || (profile.sistersCount ?? 0) > 0) && (
                <DetailTile 
                  icon={<Users size={16} color="#8C6A3F" strokeWidth={2} />} 
                  label="Siblings" 
                  value={[
                    (profile.brothersCount ?? 0) > 0 ? `${profile.brothersCount} ${profile.brothersCount === 1 ? 'Brother' : 'Brothers'}${(profile.brothersMarriedCount ?? 0) > 0 ? ` (${profile.brothersMarriedCount} married)` : ''}` : null,
                    (profile.sistersCount ?? 0) > 0 ? `${profile.sistersCount} ${profile.sistersCount === 1 ? 'Sister' : 'Sisters'}${(profile.sistersMarriedCount ?? 0) > 0 ? ` (${profile.sistersMarriedCount} married)` : ''}` : null
                  ].filter(Boolean).join(' · ')} 
                />
              )}
              {profile.hasChildren && (
                <DetailTile 
                  icon={<Heart size={16} color="#8C6A3F" strokeWidth={2} />} 
                  label="Children" 
                  value={`${profile.childrenCount ?? ''} ${profile.childrenCount === 1 ? 'Child' : 'Children'}${profile.childrenLivingStatus ? ` (${formatEnum(profile.childrenLivingStatus)})` : ''}`} 
                />
              )}

            </div>
          </div>

          {/* Footer note */}
          <div className="animate-section" style={{ animationDelay: '200ms', textAlign: 'center', marginTop: 40 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#8C6A3F', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
              Shared via {process.env.APP_DISPLAY_NAME ?? 'Bohra Taaruf'}
            </div>
            <p style={{ fontSize: 12, color: '#999', lineHeight: 1.5, margin: 0, maxWidth: 360, marginInline: 'auto' }}>
              This link was shared privately and may only be viewed once. Please handle this information with care and dignity.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}

function DetailTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start', padding: '12px 16px', background: '#fcfbf9', border: '1px solid #f0ece7', borderRadius: 12 }}>
      <div style={{ 
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #ffffff 0%, #f4f0e6 100%)',
        boxShadow: 'inset 0 1px 3px rgba(140, 106, 63, 0.1), 0 2px 4px rgba(0,0,0,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', lineHeight: 1.3 }}>{value}</div>
      </div>
    </div>
  );
}

function ExpiredPage() {
  return (
    <>
      <title>Link Expired — {process.env.APP_DISPLAY_NAME ?? 'Bohra Taaruf'}</title>
      <meta name="robots" content="noindex, nofollow" />
      <div style={{ minHeight: '100vh', margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#F8F5F0', color: '#1a1a1a' }}>
        <main style={{ maxWidth: 480, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px' }}>
            This link has expired
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: '#666', lineHeight: 1.6 }}>
            Biodata links are valid for 24 hours or one view, whichever comes first.
            Please ask the person to share a new link.
          </p>
        </main>
      </div>
    </>
  );
}

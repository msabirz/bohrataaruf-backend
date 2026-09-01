import React from 'react';
import { db } from '@/lib/db';
import {
  users, profiles, preferences, verifications, adminActionLog, volunteers, lifestyleTraitPairs, matches,
} from '@/lib/db/schema';
import { eq, desc, or, sql } from 'drizzle-orm';
import { requireAdminAuth } from '@/lib/adminAuth';
import Link from 'next/link';
import {
  ArrowLeft, User, ShieldCheck, MapPin, Phone, Calendar, Heart, ShieldAlert, ShieldX, Shield,
  Mail, GraduationCap, Briefcase, Ruler, Users as UsersIcon, Baby, Sparkles, Image as ImageIcon, EyeOff, Globe,
} from 'lucide-react';
import AdminUserActions from './AdminUserActions';
import { notFound } from 'next/navigation';
import { getViewUrl } from '@/lib/storage';
import { decryptItsNumber } from '@/lib/api/itsEncryption';

// Same snake_case -> Title Case treatment used elsewhere in the app
// (src/app/(app)/profile/page.tsx, ProfileDetailModal.tsx) — kept as its
// own local copy rather than a shared util, matching how this project
// already duplicates small display helpers per-page.
function labelize(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-gray-500 mb-1 text-xs uppercase tracking-wide">{label}</p>
      <p className="font-medium text-gray-900 text-sm">{value ?? <span className="text-gray-400 italic font-normal">Not set</span>}</p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">{children}</span>;
}

export default async function AdminUserDetailPage(props: { params: Promise<{ id: string }> }) {
  await requireAdminAuth();
  const params = await props.params;
  const targetId = params.id;

  const user = await db.select().from(users).where(eq(users.id, targetId)).limit(1).then(r => r[0]);
  if (!user) return notFound();

  const profile = await db.select().from(profiles).where(eq(profiles.userId, targetId)).limit(1).then(r => r[0]);
  const prefs = await db.select().from(preferences).where(eq(preferences.userId, targetId)).limit(1).then(r => r[0]);

  const verification = await db
    .select({
      status: verifications.status,
      cardImageKey: verifications.cardImageKey,
      itsNumberEncrypted: verifications.itsNumberEncrypted,
      rejectionReason: verifications.rejectionReason,
      reviewedAt: verifications.reviewedAt,
      createdAt: verifications.createdAt,
      reviewerName: volunteers.name,
    })
    .from(verifications)
    .leftJoin(volunteers, eq(verifications.reviewedBy, volunteers.id))
    .where(eq(verifications.userId, targetId))
    .limit(1)
    .then(r => r[0]);

  const traitPairs = await db.select().from(lifestyleTraitPairs).where(eq(lifestyleTraitPairs.active, true)).orderBy(lifestyleTraitPairs.sortOrder);

  const matchCountRow = await db.select({ count: sql<number>`count(*)::int` }).from(matches).where(or(eq(matches.userA, targetId), eq(matches.userB, targetId)));
  const matchCount = matchCountRow[0]?.count ?? 0;

  const auditLogs = await db
    .select({
      id: adminActionLog.id,
      action: adminActionLog.action,
      reason: adminActionLog.reason,
      createdAt: adminActionLog.createdAt,
      volunteerName: volunteers.name,
    })
    .from(adminActionLog)
    .leftJoin(volunteers, eq(adminActionLog.volunteerId, volunteers.id))
    .where(eq(adminActionLog.targetUserId, targetId))
    .orderBy(desc(adminActionLog.createdAt));

  const [photoUrl, cardImageUrl] = await Promise.all([
    getViewUrl(profile?.photoKey),
    getViewUrl(verification?.cardImageKey),
  ]);

  // Decrypted server-side, here, in this admin-authenticated request only —
  // same pattern as the Verifications review page.
  const itsNumber = decryptItsNumber(verification?.itsNumberEncrypted);

  const lifestyleAnswers = (profile?.lifestyleAnswers as Record<string, string> | null) || {};
  const answeredPairs = traitPairs
    .map((p) => {
      const answer = lifestyleAnswers[p.slug];
      if (answer === p.leftOptionKey) return { question: p.questionLabel, answer: p.leftOptionLabel };
      if (answer === p.rightOptionKey) return { question: p.questionLabel, answer: p.rightOptionLabel };
      return null;
    })
    .filter((x): x is { question: string; answer: string } => x !== null);

  const siblingsLine = (() => {
    const parts: string[] = [];
    if (profile?.brothersCount != null) parts.push(`${profile.brothersCount} brother${profile.brothersCount === 1 ? '' : 's'}${profile.brothersMarriedCount ? ` (${profile.brothersMarriedCount} married)` : ''}`);
    if (profile?.sistersCount != null) parts.push(`${profile.sistersCount} sister${profile.sistersCount === 1 ? '' : 's'}${profile.sistersMarriedCount ? ` (${profile.sistersMarriedCount} married)` : ''}`);
    return parts.length ? parts.join(', ') : null;
  })();

  const hasPrefs = prefs && (prefs.ageMin || prefs.ageMax || prefs.preferredCities?.length || prefs.preferredEducation?.length
    || prefs.preferredProfessions?.length || prefs.practiceLevel || prefs.familyExpectation || prefs.partnerQualityTags?.length || prefs.childrenAcceptance);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'verified': return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"><ShieldCheck className="w-4 h-4" /> Verified</span>;
      case 'pending': return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800"><ShieldAlert className="w-4 h-4" /> Pending</span>;
      case 'rejected': return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"><ShieldX className="w-4 h-4" /> Rejected</span>;
      default: return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"><Shield className="w-4 h-4" /> None</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Link href="/admin/users" className="text-sm font-medium text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </Link>
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={user.name} className="w-16 h-16 rounded-full object-cover border border-gray-200 shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                <User className="w-7 h-7 text-gray-400" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3 flex-wrap">
                {user.name}
                {!user.isActive && <span className="bg-red-100 text-red-800 text-sm px-2.5 py-0.5 rounded-full font-medium">Suspended</span>}
                {user.abandonedAt && <span className="bg-amber-100 text-amber-800 text-sm px-2.5 py-0.5 rounded-full font-medium">Abandoned</span>}
                {user.isTestAccount && <span className="bg-purple-100 text-purple-800 text-sm px-2.5 py-0.5 rounded-full font-medium">Test Account</span>}
              </h1>
              <p className="text-gray-500 mt-1 flex items-center gap-4 flex-wrap text-sm">
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {user.city || 'No city'}</span>
                <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {user.countryCode}{user.phone || 'No phone'}</span>
                {user.email && <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {user.email}</span>}
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Joined {new Date(user.createdAt!).toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> {matchCount} match{matchCount === 1 ? '' : 'es'}</span>
              </p>
            </div>
          </div>
          <div>
            {getStatusBadge(verification?.status || null)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="md:col-span-2 space-y-6">
          <Card title="Profile Details" icon={<User className="w-5 h-5 text-gray-500" />}>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <Field label="Alias" value={profile?.alias} />
              <Field label="Gender" value={labelize(user.gender)} />
              <Field label="Date of Birth" value={user.dateOfBirth} />
              <Field label="Jamaat" value={user.jamaat} />
              <Field label="Marital Status" value={labelize(profile?.maritalStatus)} />
              <Field label="Height" value={profile?.heightCm ? `${profile.heightCm} cm` : null} />
              <Field label="Willing to Relocate" value={labelize(profile?.willingToRelocate)} />
              <Field label="Preferred Language" value={labelize(user.preferredLanguage)} />
              <div className="col-span-2">
                <Field label="Education" value={profile?.education ? `${profile.education}${profile.fieldOfStudy ? ` in ${profile.fieldOfStudy}` : ''}` : null} />
              </div>
              <div className="col-span-2">
                <Field label="Profession" value={profile?.profession} />
              </div>
              <div className="col-span-2">
                <Field label="Intro Line" value={profile?.introLine ? `"${profile.introLine}"` : null} />
              </div>
              <div className="col-span-2">
                <Field label="Bio" value={profile?.bioText} />
              </div>
            </div>
          </Card>

          <Card title="Family Background" icon={<UsersIcon className="w-5 h-5 text-gray-500" />}>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <Field label="Siblings" value={siblingsLine} />
              <Field
                label="Children"
                value={profile?.hasChildren == null ? null : profile.hasChildren
                  ? `${profile.childrenCount ?? '—'} (${profile.childrenBoysCount ?? 0} boys, ${profile.childrenGirlsCount ?? 0} girls)${profile.childrenLivingStatus ? ` · ${labelize(profile.childrenLivingStatus)}` : ''}`
                  : 'None'}
              />
            </div>
          </Card>

          {hasPrefs && (
            <Card title="Partner Preferences" icon={<Heart className="w-5 h-5 text-gray-500" />}>
              <div className="space-y-4 text-sm">
                {(prefs!.ageMin || prefs!.ageMax) && (
                  <div>
                    <p className="text-gray-500 mb-1.5 text-xs uppercase tracking-wide">Age Range</p>
                    <Pill>{prefs!.ageMin ?? 'Any'}–{prefs!.ageMax ?? 'Any'} yrs</Pill>
                  </div>
                )}
                {!!prefs!.preferredCities?.length && (
                  <div>
                    <p className="text-gray-500 mb-1.5 text-xs uppercase tracking-wide">Preferred Cities</p>
                    <div className="flex flex-wrap gap-1.5">{prefs!.preferredCities.map((c) => <Pill key={c}>{c}</Pill>)}</div>
                  </div>
                )}
                {!!prefs!.preferredEducation?.length && (
                  <div>
                    <p className="text-gray-500 mb-1.5 text-xs uppercase tracking-wide">Preferred Education</p>
                    <div className="flex flex-wrap gap-1.5">{prefs!.preferredEducation.map((e) => <Pill key={e}>{e}</Pill>)}</div>
                  </div>
                )}
                {!!prefs!.preferredProfessions?.length && (
                  <div>
                    <p className="text-gray-500 mb-1.5 text-xs uppercase tracking-wide">Preferred Professions</p>
                    <div className="flex flex-wrap gap-1.5">{prefs!.preferredProfessions.map((p) => <Pill key={p}>{p}</Pill>)}</div>
                  </div>
                )}
                {!!prefs!.partnerQualityTags?.length && (
                  <div>
                    <p className="text-gray-500 mb-1.5 text-xs uppercase tracking-wide">Partner Qualities</p>
                    <div className="flex flex-wrap gap-1.5">{prefs!.partnerQualityTags.map((t) => <Pill key={t}>{t}</Pill>)}</div>
                  </div>
                )}
                {(prefs!.practiceLevel || prefs!.familyExpectation || prefs!.childrenAcceptance) && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                    <Field label="Practice Level" value={labelize(prefs!.practiceLevel)} />
                    <Field label="Family Expectation" value={labelize(prefs!.familyExpectation)} />
                    <Field label="Open to Children" value={labelize(prefs!.childrenAcceptance)} />
                  </div>
                )}
              </div>
            </Card>
          )}

          {answeredPairs.length > 0 && (
            <Card title="Lifestyle & Personality" icon={<Sparkles className="w-5 h-5 text-gray-500" />}>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {answeredPairs.map((p) => (
                  <div key={p.question} className="border border-dashed border-gray-300 rounded-lg px-3 py-2">
                    <p className="text-gray-500 text-xs">{p.question}</p>
                    <p className="font-medium text-gray-900">{p.answer}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card title="ITS Verification" icon={<ShieldCheck className="w-5 h-5 text-gray-500" />}>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-6">
                <Field label="Status" value={getStatusBadge(verification?.status || null)} />
                <Field label="ITS Number" value={itsNumber ? <span className="font-mono">{itsNumber}</span> : null} />
                <Field label="Submitted" value={verification?.createdAt ? new Date(verification.createdAt).toLocaleString() : null} />
                <Field label="Reviewed" value={verification?.reviewedAt ? `${new Date(verification.reviewedAt).toLocaleString()}${verification.reviewerName ? ` by ${verification.reviewerName}` : ''}` : null} />
              </div>
              {verification?.rejectionReason && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                  <span className="font-semibold">Rejection reason: </span>{verification.rejectionReason}
                </div>
              )}
              {cardImageUrl && (
                <div>
                  <p className="text-gray-500 mb-2 text-xs uppercase tracking-wide">ITS Card Photo</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cardImageUrl} alt="ITS Card" className="max-w-sm w-full rounded-lg border border-gray-200" />
                </div>
              )}
            </div>
          </Card>

          <Card title="Photo Privacy" icon={<EyeOff className="w-5 h-5 text-gray-500" />}>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <Field label="Privacy Mode" value={labelize(profile?.photoPrivacyMode)} />
              <Field label="Photo Uploaded" value={profile?.photoKey ? 'Yes' : 'No'} />
            </div>
          </Card>

          {/* Audit Log */}
          <Card title="Admin Action Log" icon={<Shield className="w-5 h-5 text-gray-500" />}>
            <div className="divide-y divide-gray-100 -m-6">
              {auditLogs.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">No admin actions taken on this account.</div>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id} className="p-4 flex gap-4 text-sm">
                    <div className="shrink-0 pt-0.5">
                      {log.action === 'suspended' && <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />}
                      {log.action === 'reactivated' && <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />}
                      {log.action === 'sent_prelaunch_ack_email' && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />}
                    </div>
                    <div>
                      <p className="text-gray-900">
                        <span className="font-semibold">{log.volunteerName || 'Unknown Admin'}</span>
                        {' '}<span className="capitalize">{labelize(log.action)}</span> the account.
                      </p>
                      {log.reason && <p className="text-gray-500 mt-1 bg-gray-50 p-2 rounded italic text-xs border border-gray-100">"{log.reason}"</p>}
                      <p className="text-gray-400 text-xs mt-1">{new Date(log.createdAt!).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Actions */}
        <div className="space-y-6">
          <AdminUserActions userId={user.id} isActive={user.isActive!} />
        </div>
      </div>
    </div>
  );
}

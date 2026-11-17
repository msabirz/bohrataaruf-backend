import { db } from '@/lib/db';
import { users, profiles, preferences, shareSettings, shareExtraDetails } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getViewUrl } from '@/lib/storage';
import { fetchAndBlurPhoto } from '@/lib/blurPhoto';
import { HEIGHT_PICKER_OPTIONS } from '@/lib/height';
import { containsContactInfo } from './contactGuard';
import { DEFAULT_VISIBLE_FIELDS, sanitizeVisibleFields, type ShareFieldKey } from './fields';

export interface SharedRow { label: string; value: string }
export interface SharedSection { title: string; rows: SharedRow[]; paragraph?: string }
export interface SharedProfile {
  displayName: string;
  firstName: string;
  age: number | null;
  city: string | null;
  showAge: boolean;
  showCity: boolean;
  chips: string[];
  sections: SharedSection[];
  /** blurred or own photo; null when she has no photo */
  photo: { url: string; blurred: boolean } | null;
}

const PHOTO_URL_SECONDS = 300;

function computeAge(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

const MARITAL_LABEL: Record<string, string> = { never_married: 'Unmarried', divorced: 'Divorced', widowed: 'Widowed' };
function labelize(v: string | null | undefined) {
  return v ? v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';
}

/**
 * Builds exactly what the shared page may show. Everything here is driven by the
 * allowlist (sanitizeVisibleFields) — nothing outside it is ever selected into the
 * returned object, so a stored toggle can never expose phone / email / ITS.
 */
export async function loadSharedProfile(userId: string, opts: { includePhoto?: boolean; forceBlurred?: boolean } = {}): Promise<SharedProfile | null> {
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
      heightCm: profiles.heightCm,
      photoKey: profiles.photoKey,
      photoKeyBlurred: profiles.photoKeyBlurred,
      brothersCount: profiles.brothersCount,
      sistersCount: profiles.sistersCount,
      practiceLevel: preferences.practiceLevel,
      familyExpectation: preferences.familyExpectation,
      nameMode: shareSettings.nameMode,
      photoMode: shareSettings.photoMode,
      visibleFields: shareSettings.visibleFields,
    })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .leftJoin(preferences, eq(preferences.userId, users.id))
    .leftJoin(shareSettings, eq(shareSettings.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);
  const r = rows[0];
  if (!r) return null;

  const visible = new Set<ShareFieldKey>(r.visibleFields ? sanitizeVisibleFields(r.visibleFields) : DEFAULT_VISIBLE_FIELDS);
  const has = (k: ShareFieldKey) => visible.has(k);

  const firstName = (r.name || '').trim().split(/\s+/)[0] || 'Member';
  const displayName = r.nameMode === 'full' ? (r.name || firstName) : firstName;
  const age = computeAge(r.dateOfBirth);

  const chips: string[] = [];
  if (has('age') && age !== null) chips.push(`${age} years`);
  if (has('height') && r.heightCm) chips.push(HEIGHT_PICKER_OPTIONS.find((o) => o.cm === r.heightCm)?.label ?? `${r.heightCm} cm`);
  if (has('maritalStatus') && r.maritalStatus) chips.push(MARITAL_LABEL[r.maritalStatus] ?? labelize(r.maritalStatus));
  if (has('city') && r.city) chips.push(r.city);
  if (has('jamaat') && r.jamaat) chips.push(`${r.jamaat} jamaat`);

  const sections: SharedSection[] = [];

  const about: SharedSection = { title: 'About', rows: [] };
  if (has('introLine') && r.introLine) about.paragraph = r.introLine;
  if (has('bio') && r.bioText && !containsContactInfo(r.bioText)) {
    about.rows.push({ label: 'About me', value: r.bioText });
  }
  if (about.paragraph || about.rows.length) sections.push(about);

  const work: SharedSection = { title: 'Education and work', rows: [] };
  if (has('education') && r.education) work.rows.push({ label: 'Education', value: [r.education, r.fieldOfStudy].filter(Boolean).join(' · ') });
  if (has('profession') && r.profession) work.rows.push({ label: 'Profession', value: r.profession });
  if (work.rows.length) sections.push(work);

  const family: SharedSection = { title: 'Family', rows: [] };
  if (has('siblings') && (r.brothersCount != null || r.sistersCount != null)) {
    const parts: string[] = [];
    if (r.brothersCount != null) parts.push(`${r.brothersCount} brother${r.brothersCount === 1 ? '' : 's'}`);
    if (r.sistersCount != null) parts.push(`${r.sistersCount} sister${r.sistersCount === 1 ? '' : 's'}`);
    family.rows.push({ label: 'Siblings', value: parts.join(' · ') });
  }
  const extras = await db
    .select({ label: shareExtraDetails.label, value: shareExtraDetails.value })
    .from(shareExtraDetails)
    .where(eq(shareExtraDetails.userId, userId))
    .orderBy(asc(shareExtraDetails.sortOrder), asc(shareExtraDetails.createdAt));
  for (const e of extras) {
    // Belt and braces: extra details are validated on save, but never render contact info.
    if (containsContactInfo(e.label) || containsContactInfo(e.value)) continue;
    family.rows.push({ label: e.label, value: e.value });
  }
  if (family.rows.length) sections.push(family);

  const lifestyle: SharedSection = { title: 'Lifestyle', rows: [] };
  if (has('practiceLevel') && r.practiceLevel) lifestyle.rows.push({ label: 'Practice level', value: labelize(r.practiceLevel) });
  if (has('familyExpectation') && r.familyExpectation) lifestyle.rows.push({ label: 'Family expectation', value: labelize(r.familyExpectation) });
  if (has('willingToRelocate') && r.willingToRelocate) lifestyle.rows.push({ label: 'Willing to relocate', value: labelize(r.willingToRelocate) });
  if (lifestyle.rows.length) sections.push(lifestyle);

  let photo: SharedProfile['photo'] = null;
  if (opts.includePhoto !== false) {
    if (r.photoMode === 'own' && r.photoKey && !opts.forceBlurred) {
      const url = await getViewUrl(r.photoKey, PHOTO_URL_SECONDS);
      if (url) photo = { url, blurred: false };
    } else if (r.photoKeyBlurred) {
      const url = await getViewUrl(r.photoKeyBlurred, PHOTO_URL_SECONDS);
      if (url) photo = { url, blurred: true };
    } else if (r.photoKey) {
      // No pre-made blurred copy yet (older upload): blur on the fly, embed as data URI.
      const dataUri = await fetchAndBlurPhoto(r.photoKey);
      if (dataUri) photo = { url: dataUri, blurred: true };
    }
  }

  return {
    displayName,
    firstName,
    age,
    city: r.city,
    showAge: has('age'),
    showCity: has('city'),
    chips,
    sections,
    photo,
  };
}

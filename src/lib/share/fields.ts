/**
 * Server-side allowlist of profile fields a user may put on her share page.
 * This is the privacy boundary: phone, email, ITS number and real-name-beyond-
 * name-mode are NOT in this list and can never be shared, whatever is stored in
 * share_settings.visible_fields. Everything the shared page renders goes through
 * sanitizeVisibleFields().
 */
export const SHARE_FIELD_KEYS = [
  'age',
  'maritalStatus',
  'city',
  'jamaat',
  'height',
  'education',
  'profession',
  'siblings',
  'introLine',
  'bio',
  'willingToRelocate',
  'practiceLevel',
  'familyExpectation',
] as const;

export type ShareFieldKey = (typeof SHARE_FIELD_KEYS)[number];

export const SHARE_FIELD_LABELS: Record<ShareFieldKey, string> = {
  age: 'Age',
  maritalStatus: 'Marital status',
  city: 'City',
  jamaat: 'Jamaat',
  height: 'Height',
  education: 'Education',
  profession: 'Profession',
  siblings: 'Siblings',
  introLine: 'Intro line',
  bio: 'About me',
  willingToRelocate: 'Willing to relocate',
  practiceLevel: 'Practice level',
  familyExpectation: 'Family expectation',
};

export const DEFAULT_VISIBLE_FIELDS: ShareFieldKey[] = ['age', 'maritalStatus', 'city'];

export function sanitizeVisibleFields(input: unknown): ShareFieldKey[] {
  if (!Array.isArray(input)) return [...DEFAULT_VISIBLE_FIELDS];
  const allowed = new Set<string>(SHARE_FIELD_KEYS);
  const out: ShareFieldKey[] = [];
  for (const k of input) {
    if (typeof k === 'string' && allowed.has(k) && !out.includes(k as ShareFieldKey)) out.push(k as ShareFieldKey);
  }
  return out;
}

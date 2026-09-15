import crypto from 'crypto';

// Deliberately excludes visually ambiguous characters (0/O, 1/I/L) since
// this code gets read aloud and typed by hand at a check-in desk.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomSuffix(length = 6): string {
  let out = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

// e.g. "jamnagar-taaruf-gathering" -> "JAM-7F3K9Q". Short program prefix
// purely so a stack of passes from different programs stays visually
// distinguishable — the random suffix is what actually guarantees uniqueness.
export function generatePassCode(programSlug: string): string {
  const prefix = programSlug.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'BTF';
  return `${prefix}-${randomSuffix()}`;
}

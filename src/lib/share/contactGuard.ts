/**
 * Best-effort check for phone numbers / emails typed into free text that will be
 * shown to anyone holding a share link. Used to (a) reject her own extra details
 * and (b) omit her About-me text from the shared page if it contains contact info.
 * Deliberately conservative: a false positive just hides a sentence, a false
 * negative leaks a contact detail.
 */
const EMAIL_RE = /[A-Z0-9._%+-]+\s*(@|\(at\)|\[at\]|\sat\s)\s*[A-Z0-9.-]+\s*(\.|\(dot\)|\sdot\s)\s*[A-Z]{2,}/i;
// 8+ digits once spaces, dashes, dots and brackets are ignored (covers +91 98765 43210, 98765-43210...)
function hasLongDigitRun(text: string): boolean {
  const compact = text.replace(/[\s\-.()+]/g, '');
  return /\d{8,}/.test(compact);
}
const WORD_DIGITS_RE = /\b(zero|one|two|three|four|five|six|seven|eight|nine)(\W+(zero|one|two|three|four|five|six|seven|eight|nine)){6,}/i;
const MESSAGING_RE = /(wa\.me|whatsapp\.com|t\.me|instagram\.com|facebook\.com|@\w{3,})/i;

export function containsContactInfo(text: string | null | undefined): boolean {
  if (!text) return false;
  return EMAIL_RE.test(text) || hasLongDigitRun(text) || WORD_DIGITS_RE.test(text) || MESSAGING_RE.test(text);
}

/**
 * Gentle capitalisation for text people typed themselves (names, cities, jobs, bios)
 * before it is shown on a shared page. We only touch text that is entirely lowercase
 * or entirely UPPERCASE; anything already mixed-case ("B.Tech", "McDonald's") is left
 * exactly as typed. Never changes the meaning, only the case.
 */
const ACRONYMS = new Set([
  'mba', 'mbbs', 'bds', 'bams', 'bhms', 'ca', 'cs', 'cma', 'be', 'me', 'bca', 'mca', 'bsc', 'msc', 'ba', 'ma', 'bcom', 'mcom',
  'llb', 'llm', 'md', 'ms', 'phd', 'it', 'hr', 'uk', 'usa', 'uae', 'ac', 'ssc', 'hsc', 'cfa', 'frcs', 'mrcp', 'ias', 'ips',
]);
const SMALL_WORDS = new Set(['and', 'of', 'in', 'at', 'the', 'for', 'to', 'a', 'an', 'on', 'or']);

function isUniformCase(s: string): boolean {
  const hasLower = /[a-z]/.test(s);
  const hasUpper = /[A-Z]/.test(s);
  return !(hasLower && hasUpper);
}

function capSegments(word: string): string {
  // capitalise the first letter of each part split by . - / ' (so "b.tech" -> "B.Tech", "o'brien" -> "O'Brien")
  return word.toLowerCase().replace(/(^|[.\-/'’])([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

/**
 * Short labels and values: cities, education, profession.
 * `keepShortCaps` (default true) leaves a single short ALL-CAPS token alone (MBA, CA);
 * pass false for places, where "PUNE" should become "Pune".
 */
export function tidyText(input: string | null | undefined, keepShortCaps = true): string {
  const s = (input ?? '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  if (!isUniformCase(s)) return s;
  const words = s.split(' ');
  // A single short ALL-CAPS token is most likely an acronym (MBA, CA): keep it.
  if (keepShortCaps && words.length === 1 && s === s.toUpperCase() && s.length <= 4) return s;
  return words
    .map((w, i) => {
      const bare = w.toLowerCase().replace(/[^a-z]/g, '');
      if (ACRONYMS.has(bare)) return w.toUpperCase();
      if (i > 0 && SMALL_WORDS.has(bare)) return w.toLowerCase();
      return capSegments(w);
    })
    .join(' ');
}

/** A person's name. Same rule, without the small-word exceptions. */
export function tidyName(input: string | null | undefined): string {
  const s = (input ?? '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  if (!isUniformCase(s)) return s;
  return s.split(' ').map(capSegments).join(' ');
}

/** Sentences (intro line, bio, own details): capitalise the start of each sentence if typed in lowercase. */
export function tidyParagraph(input: string | null | undefined): string {
  let s = (input ?? '').trim();
  if (!s) return '';
  // Shouting: bring it down to lowercase first, then fix sentences below.
  if (s === s.toUpperCase() && /[A-Z]{3,}/.test(s)) s = s.toLowerCase();
  return s
    .replace(/(^\s*|[.!?]\s+)([a-z])/g, (_m, pre: string, ch: string) => pre + ch.toUpperCase())
    .replace(/\bi\b(?=$|[\s,.!?;:'’])/g, 'I');
}

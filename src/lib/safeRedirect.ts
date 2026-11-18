/**
 * "?redirect=<path>" says where to send someone after they log in. It comes from the
 * address bar, so it must never be trusted: only a path on THIS site is allowed. An
 * address like https://example.com or //example.com would otherwise let a crafted
 * link send a freshly logged-in person to another website.
 */
export function safeRedirectPath(input: string | null | undefined): string | null {
  if (!input) return null;
  const p = input.trim();
  if (p.length === 0 || p.length > 200) return null;
  if (!p.startsWith('/')) return null;
  if (p.startsWith('//') || p.startsWith('/\\')) return null;
  if (/[\u0000-\u001f\u007f\\]/.test(p)) return null;
  if (/^\/[^/?#]*:\/\//.test(p) || p.includes('://')) return null;
  return p;
}

const LABELS: Record<string, string> = {
  '/share': 'your share settings',
  '/profile': 'your profile',
  '/settings': 'your settings',
  '/discover': 'Discover',
  '/interests': 'your interests',
  '/matches': 'your matches',
};

/** Friendly name for the page the person is heading to, or null if we do not know it. */
export function redirectLabel(path: string | null): string | null {
  if (!path) return null;
  const base = path.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return LABELS[base] ?? Object.entries(LABELS).find(([k]) => base.startsWith(`${k}/`))?.[1] ?? null;
}

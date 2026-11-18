/** Best-effort visitor address, used only as a rate-limit key (never stored). */
export function visitorKey(h: { get(name: string): string | null }): string {
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}

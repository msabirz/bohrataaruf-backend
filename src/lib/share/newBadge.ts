/**
 * The "New" tag on the Share entry points disappears on its own after this date,
 * so nobody has to remember to remove it (and it needs no per-user storage).
 */
export const SHARE_NEW_UNTIL = Date.parse('2027-02-28T00:00:00Z');
export function shareIsNew(now: number = Date.now()): boolean {
  return now < SHARE_NEW_UNTIL;
}

/** Site mode: 'B' = pre-launch (default), 'A' = full experience. Single source of truth
 * for the server; flipping SITE_MODE and redeploying is the entire launch action. */
export function getSiteMode(): 'A' | 'B' {
  return process.env.SITE_MODE === 'A' ? 'A' : 'B';
}

export function isModeB(): boolean {
  return getSiteMode() === 'B';
}

/**
 * Campaign tags (utm_source, utm_medium, ...) must survive the "log in first" bounce, or
 * Google Analytics cannot tell that a visit to the Share page came from the email.
 * Only utm_* parameters are carried over; anything else in the address is dropped.
 */
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

export function utmParamsFromSearch(search: string | null | undefined): URLSearchParams {
  const out = new URLSearchParams();
  if (!search) return out;
  const incoming = new URLSearchParams(search);
  for (const key of UTM_KEYS) {
    const v = incoming.get(key);
    // Short, plain values only: these are echoed into an address.
    if (v && v.length <= 100 && /^[\w .,:+\-]+$/.test(v)) out.set(key, v);
  }
  return out;
}

/** The email campaign's tags, with a label saying which button was pressed. */
export function campaignQuery(content: string): string {
  return new URLSearchParams({
    utm_source: 'email',
    utm_medium: 'email',
    // Kept as is on purpose: renaming it would split the campaign's history in GA4.
    utm_campaign: 'my-taaruf-card',
    utm_content: content,
  }).toString();
}

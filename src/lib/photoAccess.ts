function isGrantActive(approved: boolean | null | undefined, until: Date | string | null | undefined): boolean {
  if (approved !== true) return false;
  if (until == null) return true; // permanent grant
  return new Date(until).getTime() > Date.now();
}

export interface PhotoAccessRow {
  photoPrivacyMode: string;
  photoUri: string | null; // real photo key
  photoUriBlurred: string | null; // blurred derivative key
  viewsUsed: number | null;
  extraViewRequested: boolean | null;
  extraViewApproved: boolean | null;
  extraViewApprovedUntil: Date | string | null;
}

export interface PhotoAccessResult {
  photoKeyToServe: string | null;
  viewsRemaining: number;
  photoRequestStatus: 'not_applicable' | 'none' | 'pending' | 'approved' | 'denied';
  photoGrantedUntil: string | null;
}

// Raw-SQL reads of a timestamptz column come back as a Postgres text
// representation (e.g. "2026-08-04 10:11:28.597+00"), not a strict ISO8601
// string. That parses fine on V8 but isn't guaranteed on every JS engine
// (Hermes/JSC on mobile) — normalize once here so every client always
// receives an unambiguous ISO string.
function toIsoStringOrNull(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return new Date(value).toISOString();
}

/**
 * Single source of truth for which photo key (real vs. blurred) a viewer
 * should be served, given the owner's chosen privacy mode and any
 * request/grant state between the two users. Every candidate-serving call
 * site must route through this rather than hardcoding photoUriBlurred —
 * the blurred key is still always returned whenever the real one isn't
 * warranted, so the caller always has an actual image to render, never
 * nothing.
 */
export function resolvePhotoAccess(row: PhotoAccessRow): PhotoAccessResult {
  if (isGrantActive(row.extraViewApproved, row.extraViewApprovedUntil)) {
    return {
      photoKeyToServe: row.photoUri,
      viewsRemaining: 999,
      photoRequestStatus: 'approved',
      photoGrantedUntil: toIsoStringOrNull(row.extraViewApprovedUntil),
    };
  }

  const viewsUsed = row.viewsUsed ?? 0;
  const viewsRemaining = Math.max(0, 3 - viewsUsed);
  const requestStatus: PhotoAccessResult['photoRequestStatus'] = row.extraViewRequested
    ? 'pending'
    : row.extraViewApproved === false
    ? 'denied'
    : 'none';

  switch (row.photoPrivacyMode) {
    case 'always':
      return { photoKeyToServe: row.photoUri, viewsRemaining: 999, photoRequestStatus: 'not_applicable', photoGrantedUntil: null };
    case 'blur_until_match':
      return { photoKeyToServe: row.photoUriBlurred, viewsRemaining: 0, photoRequestStatus: 'not_applicable', photoGrantedUntil: null };
    case 'request_only':
      return { photoKeyToServe: row.photoUriBlurred, viewsRemaining: 0, photoRequestStatus: requestStatus, photoGrantedUntil: null };
    case 'three_then_request':
    default:
      return { photoKeyToServe: row.photoUriBlurred, viewsRemaining, photoRequestStatus: requestStatus, photoGrantedUntil: null };
  }
}

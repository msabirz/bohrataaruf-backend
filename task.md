# Task backlog

## Follow-ups (not urgent, scoped separately from the photo-leak security fix)

- **Blurred-placeholder polish for locked discovery photos.** Since the photo-leak fix
  (candidate photos now return `photoUri: null` until a legitimate view is spent via
  `POST /api/v1/matching/photo-view`), locked cards in Discover/profile-detail show a plain
  placeholder instead of a blurred preview image. A real blurred preview would need either
  (a) an on-the-fly blur per request using the existing-but-unused `fetchAndBlurPhoto` in
  `src/lib/blurPhoto.ts`, which risks reintroducing per-request latency (especially for
  `matching/batch`'s up-to-10-candidate fetch), or (b) a pre-generated blurred derivative
  stored in R2 at upload time (schema change: new `photoKeyBlurred` column, upload-time
  processing, backfill for existing photos). Needs its own scoping pass, not a quick patch.

- **Redundant "sent interests" endpoints.** `GET /api/v1/interactions/interested` already
  implements a "people I've expressed interest in, not yet matched" listing (14-day window,
  no declined-by-them exclusion, wraps response as `{ profiles: [...] }`). A newer
  `GET /api/v1/interactions/sent` was added for the web bridge build (no time window,
  excludes people who declined me, wraps as `{ profilesList: [...] }`, uses the shared
  `serializeInterestedProfile`) without noticing the existing one. Both are now live and
  correct (both got the photo-leak fix), but they're functionally overlapping — worth
  consolidating in a future pass rather than maintaining two near-duplicate endpoints.

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

## Ready to build (fully designed, not yet implemented)

- **WEB-ONLY: Home/Discover Welcome Summary Card + Preferences + Lifestyle section.**
  Mobile explicitly excluded — mobile already solves this via the existing Profile
  Completion banner + elevated Heart badge, which fit small-screen constraints better;
  adding this card to mobile would duplicate info and compete with the protected
  swipe-feed real estate.

  **Scope** — one unified card, placed above the Discover feed on web:
  1. Header: "Welcome, [name]" + current date.
  2. Three compact stat items (profile completion %, pending received interests count,
     total matches count) — NOT separate boxed dashboard tiles; numbers embedded in
     short sentences/labels, avoiding a gamified/analytics-dashboard feel (a deliberate,
     locked product principle — no addictive engagement mechanics).
  3. Inline "Complete your profile →" link — ONLY shown if completion < 100%, reusing
     the existing profile-completion endpoint. Disappears entirely at 100%.
  4. "My Preferences" section: existing REAL preference data (age range, cities,
     practice level, family expectation, etc.) shown as icon-led chip tags — reuse
     existing data, no new fields.
  5. "Lifestyle & Personality" section — NEW, marked with a "Coming soon" pill badge.
     Shows sample tags (Coffee/Chai, Introvert/Extrovert, Early riser/Night owl,
     Reader/Storyteller, Homebody/Traveler) as dotted-border placeholders with icon
     badges that gently pulse (staggered animation-delay per item, ~0.4s apart) — a
     genuinely "alive, coming soon" feel, not just static grey placeholders.

  **Real, tested interaction pattern** for when this becomes selectable (once DB fields
  exist): a segmented two-option toggle per trait. Implementation gotchas discovered
  during prototyping, worth knowing before building the real component:
  - Icon color AND text color must BOTH be explicitly updated on every selection
    change — updating only one (e.g. just text) leaves the other stuck at its initial
    color, causing an invisible-on-deselect bug.
  - If icons sit inside their own inner "badge" circle with its own background color,
    that badge background must also update (or simply stay transparent) — otherwise
    the icon's contrast breaks against the badge layer even if the OUTER container
    color updates correctly. Simplest fix: keep the icon badge transparent, let
    contrast come purely from the outer selected/unselected container color.

  **Not yet scoped, separate follow-up task**: the actual database schema for these new
  lifestyle/personality fields (which specific traits, how many, data types) — this
  design only covers the UI/interaction pattern; real field definition and backend work
  still needs its own scoping pass.

  Status: fully designed and interaction-tested (working prototype), ready to build
  once picked up.

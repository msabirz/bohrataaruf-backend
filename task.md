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

## In progress: "Share your biodata" module (WEB ONLY)

Design: https://claude.ai/artifact/13uTmZsawhEnqex6frKTkg (boards 1-12) and
`docs/share-module-journey.png` (12-step journey). Mobile app is NOT part of this — the old
app share button keeps using `biodata/generate`.

**Flow in one line:** admin presses "Send share link" on a user row -> email -> button opens her
logged-in Share page (no OTP) -> she picks what to show, makes named links -> visitor opens a
chat card / shared page -> Join button -> signup with hidden link code -> she is told someone
joined (by link label; first name only if the new user ticked consent).

**Decisions locked with the product owner**
- Email only, one user at a time (no bulk send). No app-store link. Promo text is
  admin-editable: "Find more such profiles on Bohra Taaruf. Join, and follow us on Instagram
  for updates." + Join button (signup with hidden per-link code) + @bohrataaruf + bohrataaruf.com.
- Max 5 active links per user (admin raises the limit on request via support email).
  Expiry choices: One view only (first, Recommended), 24h, 3d, 7d, 30d. One-view note:
  "open it in the browser, not inside WhatsApp". Chat-preview bots must never consume a link.
- Chat link card is ALWAYS minimal + blurred photo (first name, age, city) — cards persist
  in chats forever. Shared page shows only fields she chose; phone/email/ITS never shareable
  (server-side allowlist). Name: First/Full. Photo: Blurred (default) / My photo (needs
  password step-up + short-lived photo URL). Her own extra details (father's name, business,
  native place...) live in a SEPARATE table; text that looks like a phone/email is blocked.
- Per-link open events stored (time, phone type, app source, NO IP), kept 90 days. Admin sees
  totals only. Email open/click tracking stays in the email provider's own reports.
- Referral: new signup stores which link it came from + consent flag (checkbox unticked by
  default). Candidate told by link label; first name only if consented; nothing if sharing is
  off / link stopped / own account. Website signups only.
- "Find more such profiles" wording makes no promise about her profile; showing her profile to
  people who joined via her link is a SEPARATE later story.
- Account UI: one "Share" item in the top bar (both site modes), one Share page with three tabs
  (Links / What I share / Activity), a card on Profile, a bell notification type, one-time
  announcement. `/profile` gets a third preview ("As my share link shows it") reusing the
  guest-preview layout via shared components (refactor of `profile/page.tsx` = own step).
- Email: new React Email template + `sendShareInviteEmail()` in `src/lib/email/index.ts`
  (bypasses EMAIL_ENABLED like the pre-launch email, throws on provider failure, logged in
  `admin_action_log`). Nothing MSG91-specific in share code (Brevo migration is a separate
  story). MSG91 free plan = 5,000 emails/month shared by ALL email types — send in batches.
- Admin Users list: add profile completion % (via `computeProfileCompletion`, never
  re-implemented in SQL), photo, preferences filled, email on file, share-link status; filters
  + sort. Final column list still to confirm with the product owner.

**Phases**
1. DB migration (dev first, prod only after separate approval) + public shared page `/s/[token]`
   + chat-card preview image + "link ended" page.
2. Account Share page (3 tabs), activity, stop link, switch sharing off, nav item, Profile card.
3. Signup referral mapping + bell notification + admin Send button, promo editor, analytics.
4. Admin Users columns + profile-page component refactor + third preview mode.

**Needs explicit approval before touching:** schema/migrations, signup route, shared header,
`profile/page.tsx`, applying anything to the production database.

**Not in scope:** mobile app, ITNC committee module (parked), Vercel Pro analytics.

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

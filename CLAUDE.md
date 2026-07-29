@AGENTS.md
# bohra-taaruf-backend

Next.js 15 (App Router) backend for BohraTaaruf — serves the API for 
the mobile app, the admin/volunteer panel (`/admin/*`), and the public 
marketing website (`(marketing)` route group), all in one repo. 
Neon Postgres via Drizzle ORM, Cloudflare R2 (photo storage), Upstash 
Redis (rate limiting).

**Sibling repo**: `BohraTaaruf` (separate Claude Code session) — the 
React Native mobile app. Both share this same backend/database — an 
account created via the website works identically in the app, and 
vice versa.

## Before making any non-trivial change

1. Investigate the REAL current code first (grep/read actual files, 
   query the actual database) — don't assume.
2. For anything touching shared/core logic (auth, matching queries, 
   schema), propose a plan and confirm before implementing.
3. Check `task.md` for the current backlog, priorities, and complexity 
   tiers before starting new work.

## Critical, easy-to-miss conventions

- **Next.js 15 dynamic route `params` is a Promise** — must `await 
  params` before destructuring. Has caused real 500 errors more than 
  once.
- **`drizzle-kit`'s interactive CLI prompts hang in this environment** 
  — established, proven fallback: write a raw SQL migration script, 
  register it in `_journal.json`, apply via a one-off script.
- **`neon-http` driver's raw `db.execute()` returns `{rows, rowCount}`, 
  not a flat array** — always use the `executeQuery()` wrapper.
- **Middleware public-route whitelist**: new public-facing endpoints 
  (marketing forms, public stats, etc.) must be explicitly added to 
  `middleware.ts`'s public routes or they 401 for anonymous visitors.
- **snake_case vs camelCase**: same recurring mismatch class as the 
  mobile app — verify exact field names in API responses.
- **Shared logic must stay shared**: `buildBaseCandidateQuery`, 
  `computeMatchScore`, `getDisplayName`, `sendPushNotification` etc. 
  are single-source-of-truth helpers used across multiple endpoints — 
  never duplicate this logic per-route.
- **Reports/withdrawal-cooldown exclusions are intentionally PERMANENT** 
  and separate from the skip-recycling logic (still pending) — do not 
  conflate these two exclusion mechanisms.
- **Never mutate an arbitrary real row for test scripts** (e.g. 
  `db.select().from(users).limit(1)` with no `WHERE`) — this previously 
  landed on real accounts and left permanent contamination (fake 
  `verified` status, garbage photo keys). Use the dedicated test-fixture 
  accounts instead: `TEST_FIXTURE_USER_ID` / `TEST_FIXTURE_USER_ID_2` in 
  `src/lib/testFixtures.ts` (`users.is_test_account = true`, structurally 
  excluded from `buildBaseCandidateQuery` regardless of state). Recreate 
  them via `create_test_fixture_account.ts` if ever dropped.

## Design system

Same bronze/gold palette as the mobile app (see BohraTaaruf/CLAUDE.md) 
— the marketing site and admin panel should stay visually consistent 
with it. Note: `/admin/verifications` still uses generic (non-bronze) 
styling — a known, logged, low-priority item.

## Privacy/security principles — do not violate

- Raw ITS number is NEVER stored — only an HMAC-SHA256 hash.
- Real name and unblurred photo are shown ONLY via the matches endpoint, 
  only for genuine mutual matches — verified via direct API audit.
- No AI-generated or stock photography in marketing — geometric/ 
  illustration only.

## Testing discipline

Same as the mobile app — real evidence (actual DB query output, actual 
API response, actual screenshot) required before considering anything 
fixed or confirmed working.

## Current state

See `task.md` for the full, tiered backlog. Core backend, admin panel 
(5 modules), marketing website, alias/privacy system, and the rename to 
BohraTaaruf are complete as of this session. Full web parity (Phase 2) 
is a confirmed future initiative needing its own dedicated scoping pass 
— do not attempt to scope or build it casually alongside smaller tasks.
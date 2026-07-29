/**
 * Well-known test-fixture account IDs. Rows are flagged users.is_test_account = true
 * and structurally excluded from buildBaseCandidateQuery regardless of their state.
 * Scripts that mutate DB rows for testing must target these IDs, never an arbitrary
 * real user selected via .limit(N).
 *
 * A second fixture exists because a few scripts (notifications, support tickets)
 * exercise two-account interactions (interest/match, cross-account isolation) and
 * genuinely need two distinct accounts.
 */
export const TEST_FIXTURE_USER_ID = '00000000-0000-4000-8000-0000face1234';
export const TEST_FIXTURE_USER_ID_2 = '00000000-0000-4000-8000-0000face5678';

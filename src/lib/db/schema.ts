import {
  pgTable,
  uuid,
  text,
  boolean,
  date,
  timestamp,
  pgEnum,
  integer,
  doublePrecision,
  unique,
  index,
  jsonb,
  check,
  primaryKey
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ── Enums ─────────────────────────────────────────────────────────────

export const genderEnum = pgEnum('gender', ['male', 'female']);
export const languageEnum = pgEnum('preferred_language', ['en', 'gu', 'ur']);
export const verificationStatusEnum = pgEnum('verification_status', ['pending', 'verified', 'rejected']);
export const relocateEnum = pgEnum('willing_to_relocate', ['yes', 'no', 'depends']);
export const maritalStatusEnum = pgEnum('marital_status', ['never_married', 'divorced', 'widowed']);
export const practiceLevelEnum = pgEnum('practice_level', ['very_devout', 'practicing', 'moderate', 'flexible']);
export const familyExpectationEnum = pgEnum('family_expectation', ['very_important', 'somewhat', 'flexible']);
export const actionEnum = pgEnum('interaction_action', ['skip', 'interested', 'withdrawn', 'declined']);
export const handoffStatusEnum = pgEnum('handoff_status', ['pending', 'shared']);
export const chunkTypeEnum = pgEnum('chunk_type', ['opening', 'profession', 'family', 'partner_pref', 'closing']);
export const chunkLanguageEnum = pgEnum('chunk_language', ['en', 'gu', 'ur']);
export const biodataLinkOutcomeEnum = pgEnum('biodata_link_outcome', ['pending', 'viewed', 'expired_unviewed']);
export const contactMessageStatusEnum = pgEnum('contact_message_status', ['new', 'in_progress', 'resolved', 'closed']);
export const reportReasonEnum = pgEnum('report_reason', ['fake_profile', 'inappropriate_photo', 'inappropriate_content', 'harassment', 'not_genuine', 'other']);
export const reportStatusEnum = pgEnum('report_status', ['pending', 'reviewed', 'actioned', 'dismissed']);
export const otpPurposeEnum = pgEnum('otp_purpose', ['login', 'password_reset']);
export const genderRouteEnum = pgEnum('gender_route', ['MALE', 'FEMALE', 'NEUTRAL']);
export const childrenLivingStatusEnum = pgEnum('children_living_status', ['with_me', 'not_with_me', 'adults_independent']);
export const childrenAcceptanceEnum = pgEnum('children_acceptance', ['yes', 'open', 'prefer_not']);
export const photoPrivacyModeEnum = pgEnum('photo_privacy_mode', ['always', 'three_then_request', 'request_only', 'blur_until_match']);

// ── Tables ────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: text('phone'),
  countryCode: text('country_code').notNull().default('+91'),
  email: text('email'),
  itsNumberHash: text('its_number_hash').unique(),
  passwordHash: text('password_hash'),
  name: text('name').notNull(),
  gender: genderEnum('gender'),
  dateOfBirth: date('date_of_birth'),
  city: text('city'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  jamaat: text('jamaat'),
  preferredLanguage: languageEnum('preferred_language').default('gu'),
  isActive: boolean('is_active').default(true),
  abandonedAt: timestamp('abandoned_at'),
  isTestAccount: boolean('is_test_account').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
}, (table) => ({
  phoneCountryCodeUnique: unique('users_phone_country_code_unique').on(table.phone, table.countryCode),
}));

export const volunteers = pgTable('volunteers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const aliasFrameworks = pgTable('alias_frameworks', {
  id: uuid('id').primaryKey().defaultRandom(),
  frameworkName: text('framework_name').notNull(),
  genderRoute: genderRouteEnum('gender_route').notNull(),
  prefixes: jsonb('prefixes').notNull(), // string[]
  suffixes: jsonb('suffixes').notNull(), // string[]
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  uploadedBy: uuid('uploaded_by').references(() => volunteers.id, { onDelete: 'set null' }),
});

export const verifications = pgTable('verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).unique().notNull(),
  status: verificationStatusEnum('status').default('pending'),
  cardImageKey: text('card_image_key'),
  rejectionReason: text('rejection_reason'),
  reviewedBy: uuid('reviewed_by').references(() => volunteers.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at'),
  vouchedBy: uuid('vouched_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const profiles = pgTable('profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  alias: text('alias').unique().notNull(),
  education: text('education'),
  fieldOfStudy: text('field_of_study'),
  profession: text('profession'),
  heightCm: integer('height_cm'),
  willingToRelocate: relocateEnum('willing_to_relocate'),
  maritalStatus: maritalStatusEnum('marital_status'),
  bioText: text('bio_text'),
  introLine: text('intro_line'),
  photoKey: text('photo_key'),
  photoKeyBlurred: text('photo_key_blurred'),
  photoPrivacyMode: photoPrivacyModeEnum('photo_privacy_mode').default('three_then_request').notNull(),
  lastAliasRegenerationAt: timestamp('last_alias_regeneration_at'),
  aliasRegenerationCount: integer('alias_regeneration_count').default(0).notNull(),
  brothersCount: integer('brothers_count').default(0),
  brothersMarriedCount: integer('brothers_married_count').default(0),
  sistersCount: integer('sisters_count').default(0),
  sistersMarriedCount: integer('sisters_married_count').default(0),
  hasChildren: boolean('has_children'),
  childrenCount: integer('children_count'),
  childrenBoysCount: integer('children_boys_count'),
  childrenGirlsCount: integer('children_girls_count'),
  childrenLivingStatus: childrenLivingStatusEnum('children_living_status'),
  // { [lifestyleTraitPairs.slug]: selectedOptionKey } — no FK, no join table.
  // An absent key means the user hasn't answered that pair yet (distinct
  // from an empty-string answer, which never happens).
  lifestyleAnswers: jsonb('lifestyle_answers'),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

export const preferences = pgTable('preferences', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  ageMin: integer('age_min'),
  ageMax: integer('age_max'),
  preferredCities: text('preferred_cities').array(),
  preferredEducation: text('preferred_education').array(),
  preferredProfessions: text('preferred_professions').array(),
  familyExpectation: familyExpectationEnum('family_expectation'),
  practiceLevel: practiceLevelEnum('practice_level'),
  partnerQualityTags: text('partner_quality_tags').array(),
  childrenAcceptance: childrenAcceptanceEnum('children_acceptance'),
});

export const adminActionLog = pgTable('admin_action_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  volunteerId: uuid('volunteer_id').references(() => volunteers.id, { onDelete: 'set null' }),
  targetUserId: uuid('target_user_id'), // Nullable
  targetVolunteerId: uuid('target_volunteer_id'), // Nullable
  action: text('action').notNull(), // 'suspended', 'reactivated', 'deleted', 'volunteer_deactivated', 'volunteer_reactivated'
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const interactions = pgTable('interactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  targetId: uuid('target_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  action: actionEnum('action').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    userTargetUnique: unique().on(table.userId, table.targetId),
    userIdActionIdx: index('interactions_user_action_idx').on(table.userId, table.action),
    targetIdIdx: index('interactions_target_id_idx').on(table.targetId),
  };
});

export const withdrawalLog = pgTable('withdrawal_log', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  targetId: uuid('target_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  withdrawnCount: integer('withdrawn_count').default(0).notNull(),
  lastWithdrawnAt: timestamp('last_withdrawn_at').defaultNow().notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.targetId] }),
  };
});

export const matches = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  userA: uuid('user_a').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  userB: uuid('user_b').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  matchedAt: timestamp('matched_at').defaultNow(),
  handoffAStatus: handoffStatusEnum('handoff_a_status').default('pending'),
  handoffAHandles: jsonb('handoff_a_handles'), // e.g. {"instagram": "@username"}
  handoffBStatus: handoffStatusEnum('handoff_b_status').default('pending'),
  handoffBHandles: jsonb('handoff_b_handles'),
  suggestedOpener: text('suggested_opener'),
}, (table) => {
  return {
    userABUnique: unique().on(table.userA, table.userB),
    userAIdx: index('matches_user_a_idx').on(table.userA),
    userBIdx: index('matches_user_b_idx').on(table.userB),
    userA_lt_userB: check('user_a_lt_user_b', sql`${table.userA} < ${table.userB}`),
  };
});

export const photoViews = pgTable('photo_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  viewerId: uuid('viewer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  profileId: uuid('profile_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  viewsUsed: integer('views_used').default(0),
  extraViewRequested: boolean('extra_view_requested').default(false),
  extraViewApproved: boolean('extra_view_approved'),
  // Absolute instant (a deadline), not a wall-clock value — must carry an
  // explicit timezone. A plain `timestamp` column round-trips incorrectly:
  // confirmed via direct testing that both the driver's default Date
  // serialization on write AND naive-string parsing on raw-SQL read each
  // introduce a ~5.5h (IST server offset) error in opposite directions.
  extraViewApprovedUntil: timestamp('extra_view_approved_until', { withTimezone: true }),
  lastViewedAt: timestamp('last_viewed_at'),
}, (table) => {
  return {
    viewerProfileUnique: unique().on(table.viewerId, table.profileId),
    viewerProfileIdx: index('photo_views_viewer_profile_idx').on(table.viewerId, table.profileId),
  };
});

export const bioChunks = pgTable('bio_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  chunkType: chunkTypeEnum('chunk_type').notNull(),
  conditionKey: text('condition_key'),
  templateText: text('template_text').notNull(),
  language: chunkLanguageEnum('language').default('en'),
});

export const otps = pgTable('otps', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: text('phone').notNull(),
  purpose: otpPurposeEnum('purpose').default('login').notNull(),
  codeHash: text('code_hash').notNull(),
  attempts: integer('attempts').default(0),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    phoneIdx: index('otps_phone_idx').on(table.phone),
  };
});

// ── Biodata Links ──────────────────────────────────────────────────────

/**
 * Operational table. Only contains currently-valid, unconsumed links.
 * Rows are DELETED (not soft-deleted) when consumed or expired.
 * The UNIQUE constraint on user_id enforces at most one active link per user.
 */
export const biodataLinks = pgTable('biodata_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  token: text('token').unique().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
});

/**
 * Append-only audit log. NEVER deleted.
 * Stores token_hash (SHA-256 hex of the raw token), never the raw token.
 * viewer_ip is populated at consume-time by a real (non-bot) request.
 */
export const biodataLinkHistory = pgTable('biodata_link_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  tokenHash: text('token_hash').notNull(),
  generatedAt: timestamp('generated_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  viewedAt: timestamp('viewed_at'),
  viewerIp: text('viewer_ip'),
  outcome: biodataLinkOutcomeEnum('outcome').default('pending').notNull(),
}, (table) => {
  return {
    userIdIdx: index('biodata_link_history_user_id_idx').on(table.userId),
    tokenHashIdx: index('biodata_link_history_token_hash_idx').on(table.tokenHash),
  };
});

// ── Push Notifications ───────────────────────────────────────────────

export const pushTokens = pgTable('push_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').unique().notNull(),
  platform: text('platform').notNull(), // 'ios' | 'android'
  createdAt: timestamp('created_at').defaultNow(),
});

export const pushPreferences = pgTable('push_preferences', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  matchesEnabled: boolean('matches_enabled').default(true).notNull(),
  receivedInterestsEnabled: boolean('received_interests_enabled').default(true).notNull(),
  verificationUpdatesEnabled: boolean('verification_updates_enabled').default(true).notNull(),
  handoffUpdatesEnabled: boolean('handoff_updates_enabled').default(true).notNull(),
  securityAlertsEnabled: boolean('security_alerts_enabled').default(true).notNull(),
  supportAlertsEnabled: boolean('support_alerts_enabled').default(true).notNull(),
  photoRequestsEnabled: boolean('photo_requests_enabled').default(true).notNull(),
});

// ── Photo Privacy ────────────────────────────────────────────────────

/**
 * Admin-configurable: which photo privacy modes each gender is allowed to
 * pick, and which mode new profiles of that gender default to. Editable via
 * the admin panel — never hardcode a gender→mode mapping in application code,
 * always read this table.
 */
export const photoPrivacyGenderRules = pgTable('photo_privacy_gender_rules', {
  gender: genderEnum('gender').primaryKey(),
  allowedModes: photoPrivacyModeEnum('allowed_modes').array().notNull(),
  defaultMode: photoPrivacyModeEnum('default_mode').notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

// ── Lifestyle & Personality ──────────────────────────────────────────

/**
 * Admin-configurable: the set of binary trait-pair questions shown in
 * Edit Profile's "Lifestyle & Personality" section (e.g. "Coffee or
 * Chai?"). New pairs can be added without a migration or app deploy —
 * mobile/website both fetch this list at render time. A user's answer to
 * a pair is stored on profiles.lifestyleAnswers keyed by `slug`, not via
 * a foreign key, so removing/deactivating a pair here never requires a
 * data migration on profiles.
 */
export const lifestyleTraitPairs = pgTable('lifestyle_trait_pairs', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').unique().notNull(),
  questionLabel: text('question_label').notNull(),
  leftOptionKey: text('left_option_key').notNull(),
  leftOptionLabel: text('left_option_label').notNull(),
  leftIconMobile: text('left_icon_mobile').notNull(), // Feather icon name, or "custom:<name>"
  leftIconWeb: text('left_icon_web').notNull(), // lucide-react icon name, or "custom:<name>"
  rightOptionKey: text('right_option_key').notNull(),
  rightOptionLabel: text('right_option_label').notNull(),
  rightIconMobile: text('right_icon_mobile').notNull(),
  rightIconWeb: text('right_icon_web').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const contactMessages = pgTable('contact_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  status: contactMessageStatusEnum('status').default('new').notNull(),
  adminReplyText: text('admin_reply_text'),
  repliedAt: timestamp('replied_at'),
  handledBy: uuid('handled_by').references(() => volunteers.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  reporterId: uuid('reporter_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  reportedUserId: uuid('reported_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  reason: reportReasonEnum('reason').notNull(),
  details: text('details'),
  status: reportStatusEnum('status').default('pending').notNull(),
  reviewedBy: uuid('reviewed_by').references(() => volunteers.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notificationsLog = pgTable('notifications_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(), // 'match', 'received_interest', 'verification_result', 'handoff', 'security_alert', 'support_reply'
  title: text('title').notNull(),
  body: text('body').notNull(),
  relatedId: uuid('related_id'),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

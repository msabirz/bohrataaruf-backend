import { z } from 'zod';

// Single wire format accepted for DOB across every client (mobile + marketing
// website) — DD/MM/YYYY. The website's native <input type="date"> emits ISO
// and must convert client-side before POSTing; the backend never learns a
// second format. Mirrors mobile's src/lib/dob.ts parseDobString logic.
const DOB_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export function parseDobStrict(value: string): Date | null {
  const match = DOB_REGEX.exec(value.trim());
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

const MIN_AGE_MALE = 20;
const MIN_AGE_FEMALE = 18;
const MAX_AGE = 100;

function computeAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export const RequestOtpSchema = z.object({
  phone: z.string().regex(/^\d{6,14}$/, 'phone must be digits only (no country code)'),
  countryCode: z.string().regex(/^\+\d{1,4}$/, 'countryCode must be like +91'),
});

export const VerifyOtpSchema = z.object({
  phone: z.string().regex(/^\d{6,14}$/, 'phone must be digits only (no country code)'),
  countryCode: z.string().regex(/^\+\d{1,4}$/, 'countryCode must be like +91'),
  code: z.string().length(6),
});

export const LoginSchema = z.object({
  itsNumber: z.string().length(8).regex(/^\d{8}$/, 'ITS number must be exactly 8 digits'),
  password: z.string().min(6),
});

// Min 8 chars, at least one lowercase, one uppercase, one digit, one symbol.
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_MESSAGE = 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a symbol.';

export const SignupSchema = z.object({
  itsNumber: z.string().length(8).regex(/^\d{8}$/, 'ITS number must be exactly 8 digits'),
  password: z.string().regex(PASSWORD_REGEX, PASSWORD_MESSAGE),
});

export const SetPasswordSchema = z.object({
  password: z.string().min(6),
});

export const ResetPasswordRequestSchema = z.object({
  itsNumber: z.string().length(8).regex(/^\d{8}$/, 'ITS number must be exactly 8 digits'),
});

export const ResetPasswordConfirmSchema = z.object({
  itsNumber: z.string().length(8).regex(/^\d{8}$/, 'ITS number must be exactly 8 digits'),
  otp: z.string().length(6),
  newPassword: z.string().min(6),
});

export const BasicsSchema = z.object({
  name: z.string().max(100).nullable().optional(),
  dob: z.string().nullable().optional(),
  gender: z.enum(['male', 'female']).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  phone: z.string().regex(/^\d{6,14}$/, 'phone must be digits only (no country code)').nullable().optional(),
  countryCode: z.string().regex(/^\+\d{1,4}$/, 'countryCode must be like +91').nullable().optional(),
  jamaat: z.string().max(100).nullable().optional(),
  preferredLanguage: z.enum(['en', 'gu', 'ur']).nullable().optional(),
  education: z.string().max(100).nullable().optional(),
  fieldOfStudy: z.string().max(100).nullable().optional(),
  profession: z.string().max(100).nullable().optional(),
  heightCm: z.number().int().min(100).max(250).nullable().optional(),
  willingToRelocate: z.enum(['yes', 'no', 'depends']).nullable().optional(),
  maritalStatus: z.enum(['never_married', 'divorced', 'widowed']).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  brothersCount: z.number().nullable().optional(),
  brothersMarriedCount: z.number().nullable().optional(),
  sistersCount: z.number().nullable().optional(),
  sistersMarriedCount: z.number().nullable().optional(),
  hasChildren: z.boolean().nullable().optional(),
  childrenCount: z.number().nullable().optional(),
  childrenBoysCount: z.number().nullable().optional(),
  childrenGirlsCount: z.number().nullable().optional(),
  childrenLivingStatus: z.enum(['with_me', 'not_with_me', 'adults_independent']).nullable().optional(),
}).superRefine((data, ctx) => {
  if (!data.dob || !data.gender) return;

  const parsed = parseDobStrict(data.dob);
  if (!parsed) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dob'], message: 'dob must be in DD/MM/YYYY format' });
    return;
  }

  const age = computeAge(parsed);
  if (age > MAX_AGE) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dob'], message: 'dob is not a valid age' });
    return;
  }

  const minAge = data.gender === 'male' ? MIN_AGE_MALE : MIN_AGE_FEMALE;
  if (age < minAge) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dob'],
      message: `Minimum age for ${data.gender} applicants is ${minAge}`,
    });
  }
});

export const PreferencesSchema = z.object({
  ageRange: z.object({ min: z.number().nullable().optional(), max: z.number().nullable().optional() }).optional(),
  cities: z.array(z.string()).nullable().optional(),
  education: z.array(z.string()).nullable().optional(),
  professions: z.array(z.string()).nullable().optional(),
  practiceLevel: z.enum(['very_devout', 'practicing', 'moderate', 'flexible']).nullable().optional(),
  familyExpectation: z.enum(['very_important', 'somewhat', 'flexible']).nullable().optional(),
  partnerQualityTags: z.array(z.string()).nullable().optional(),
  childrenAcceptance: z.enum(['yes', 'open', 'prefer_not']).nullable().optional(),
});

export const HandoffSchema = z.object({
  platform: z.string(),
  handle: z.string(),
});

export const ItsCardSchema = z.object({
  cardImageKey: z.string().min(1),
  itsNumber: z.string().length(8).regex(/^\d{8}$/, 'ITS number must be exactly 8 digits'),
});

export const UpdateProfileSchema = z.object({
  name: z.string().max(100).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  city: z.string().max(100).nullable().optional(),
  jamaat: z.string().max(100).nullable().optional(),
  preferredLanguage: z.enum(['en', 'gu', 'ur']).nullable().optional(),
  alias: z.string().max(100).nullable().optional(),
  education: z.string().max(100).nullable().optional(),
  fieldOfStudy: z.string().max(100).nullable().optional(),
  profession: z.string().max(100).nullable().optional(),
  heightCm: z.number().int().min(100).max(250).nullable().optional(),
  willingToRelocate: z.enum(['yes', 'no', 'depends']).nullable().optional(),
  maritalStatus: z.enum(['never_married', 'divorced', 'widowed']).nullable().optional(),
  bio: z.string().max(300).nullable().optional(),
  introLine: z.string().max(100).nullable().optional(),
  brothersCount: z.number().nullable().optional(),
  brothersMarriedCount: z.number().nullable().optional(),
  sistersCount: z.number().nullable().optional(),
  sistersMarriedCount: z.number().nullable().optional(),
  hasChildren: z.boolean().nullable().optional(),
  childrenCount: z.number().nullable().optional(),
  childrenBoysCount: z.number().nullable().optional(),
  childrenGirlsCount: z.number().nullable().optional(),
  childrenLivingStatus: z.enum(['with_me', 'not_with_me', 'adults_independent']).nullable().optional(),
  photoPrivacyMode: z.enum(['always', 'three_then_request', 'request_only', 'blur_until_match']).optional(),
  // { [lifestyleTraitPairs.slug]: selectedOptionKey } — further validated
  // against currently-active pairs in the route handler itself, since the
  // valid slugs/option keys are admin-configurable data, not a fixed enum.
  lifestyleAnswers: z.record(z.string(), z.string()).nullable().optional(),
});

export const UploadPhotoSchema = z.object({
  photoKey: z.string(),
});

export const SaveBioSchema = z.object({
  bio: z.string().max(300).optional(),
  introLine: z.string().max(100).optional(),
});

export const GenerateBioSchema = z.object({
  inputs: z.any(),
  shortForm: z.boolean().optional(),
});

export const RecordPhotoViewSchema = z.object({
  profileId: z.string().uuid(),
});

export const RequestPhotoViewSchema = z.object({
  profileId: z.string().uuid(),
});

export const RespondPhotoViewRequestSchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('approve'), duration: z.enum(['24h', '48h', 'permanent']) }),
  z.object({ decision: z.literal('deny') }),
]);

export const TargetIdSchema = z.object({
  profileId: z.string().uuid(),
});

export const NearbySessionSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  isVisible: z.boolean().optional(),
  familyMode: z.boolean().optional(),
});

export const NearbyNudgeSchema = z.object({
  toUserId: z.string().uuid(),
});

export const NearbyNudgeMessageSchema = z.object({
  message: z.string().min(1).max(500),
});

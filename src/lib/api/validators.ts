import { z } from 'zod';

export const RequestOtpSchema = z.object({
  phone: z.string().min(10),
});

export const VerifyOtpSchema = z.object({
  phone: z.string().min(10),
  code: z.string().length(6),
});

export const LoginSchema = z.object({
  itsNumber: z.string().min(8),
  password: z.string().min(6),
});

export const SetPasswordSchema = z.object({
  password: z.string().min(6),
});

export const ResetPasswordRequestSchema = z.object({
  itsNumber: z.string().min(8),
});

export const ResetPasswordConfirmSchema = z.object({
  itsNumber: z.string().min(8),
  otp: z.string().length(6),
  newPassword: z.string().min(6),
});

export const BasicsSchema = z.object({
  name: z.string().nullable().optional(),
  dob: z.string().nullable().optional(),
  gender: z.enum(['male', 'female']),
  city: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  jamaat: z.string().nullable().optional(),
  preferredLanguage: z.enum(['en', 'gu', 'ur']).nullable().optional(),
  education: z.string().nullable().optional(),
  fieldOfStudy: z.string().nullable().optional(),
  profession: z.string().nullable().optional(),
  heightCm: z.number().int().min(100).max(250).nullable().optional(),
  willingToRelocate: z.enum(['yes', 'no', 'depends']).nullable().optional(),
  maritalStatus: z.enum(['never_married', 'divorced', 'widowed']).nullable().optional(),
  brothersCount: z.number().nullable().optional(),
  brothersMarriedCount: z.number().nullable().optional(),
  sistersCount: z.number().nullable().optional(),
  sistersMarriedCount: z.number().nullable().optional(),
  hasChildren: z.boolean().nullable().optional(),
  childrenCount: z.number().nullable().optional(),
  childrenBoysCount: z.number().nullable().optional(),
  childrenGirlsCount: z.number().nullable().optional(),
  childrenLivingStatus: z.enum(['with_me', 'not_with_me', 'adults_independent']).nullable().optional(),
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
  itsNumber: z.string().min(8),
});

export const UpdateProfileSchema = z.object({
  name: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  city: z.string().nullable().optional(),
  jamaat: z.string().nullable().optional(),
  preferredLanguage: z.enum(['en', 'gu', 'ur']).nullable().optional(),
  alias: z.string().nullable().optional(),
  education: z.string().nullable().optional(),
  fieldOfStudy: z.string().nullable().optional(),
  profession: z.string().nullable().optional(),
  heightCm: z.number().int().min(100).max(250).nullable().optional(),
  willingToRelocate: z.enum(['yes', 'no', 'depends']).nullable().optional(),
  maritalStatus: z.enum(['never_married', 'divorced', 'widowed']).nullable().optional(),
  bio: z.string().nullable().optional(),
  introLine: z.string().nullable().optional(),
  brothersCount: z.number().nullable().optional(),
  brothersMarriedCount: z.number().nullable().optional(),
  sistersCount: z.number().nullable().optional(),
  sistersMarriedCount: z.number().nullable().optional(),
  hasChildren: z.boolean().nullable().optional(),
  childrenCount: z.number().nullable().optional(),
  childrenBoysCount: z.number().nullable().optional(),
  childrenGirlsCount: z.number().nullable().optional(),
  childrenLivingStatus: z.enum(['with_me', 'not_with_me', 'adults_independent']).nullable().optional(),
});

export const UploadPhotoSchema = z.object({
  photoKey: z.string(),
});

export const SaveBioSchema = z.object({
  bio: z.string().optional(),
  introLine: z.string().optional(),
});

export const GenerateBioSchema = z.object({
  inputs: z.any(),
  shortForm: z.boolean().optional(),
});

export const RecordPhotoViewSchema = z.object({
  profileId: z.string().uuid(),
});

export const TargetIdSchema = z.object({
  profileId: z.string().uuid(),
});

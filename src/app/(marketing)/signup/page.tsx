'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useModeContext } from '@/lib/context/ModeContext';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Chip } from '@/components/ui/Chip';
import { ImageUploadWithCrop } from '@/components/ui/ImageUploadWithCrop';
import { FamilySection } from '@/components/ui/FamilySection';
import { ChildrenSection } from '@/components/ui/ChildrenSection';
import { HEIGHT_PICKER_OPTIONS, DEFAULT_HEIGHT_CM } from '@/lib/height';
import { getOnboardingLocation } from '@/lib/location';
import { PhotoPrivacyPicker, type PhotoPrivacyMode } from '@/components/ui/PhotoPrivacyPicker';

// Same lists as the mobile app's onboarding/basics.tsx, so a user's own
// education/profession means the same thing regardless of which platform
// they signed up on.
const EDUCATION_OPTIONS = ['High School', 'B.Com', 'B.Tech', 'MBBS', 'BDS', 'MBA', 'CA', 'M.Ed', 'PhD', 'Other'];
const PROFESSION_OPTIONS = ['Doctor', 'Engineer', 'Teacher', 'Business', 'CA', 'Dentist', 'Lawyer', 'Homemaker', 'Other'];
const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'ur', label: 'Urdu' },
];
const RELOCATE_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'depends', label: 'Depends' },
];
const MARITAL_STATUSES = [
  { value: 'never_married', label: 'Never Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
];
const COUNTRY_CODE_OPTIONS = ['+91', '+971', '+1', '+44', '+92', 'Other'];

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BIO_REROLLS = 3;

function passwordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { score, label: 'Weak', color: '#dc2626' };
  if (score <= 4) return { score, label: 'Fair', color: '#d97706' };
  return { score, label: 'Strong', color: '#16a34a' };
}

export default function SignupPage() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent-light rounded-full blur-[100px] opacity-40 -z-10" />

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Join {process.env.NEXT_PUBLIC_APP_DISPLAY_NAME ?? 'Bohra Taaruf'}</h1>
        <p className="text-muted">Your journey to finding the right match starts here.</p>
      </div>

      <Suspense fallback={
        <div className="bg-surface p-8 rounded-3xl shadow-sm border border-border max-w-md w-full h-[500px] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }>
        <SignupWizard />
      </Suspense>
    </div>
  );
}

// Step order: 1 = ITS number + card photo + password (auto-login, no OTP
// verification during signup "as of now"); 2 = phone & email (only shown to
// a returning user with incomplete onboarding); 3 = basics; 4 = photo;
// 5 = bio; 6 = done. Preferences is intentionally dropped from this flow.
function SignupWizard() {
  const router = useRouter();
  const { mode } = useModeContext();
  const postAuthPath = mode === 'B' ? '/profile' : '/discover';
  const [step, setStep] = useState<number>(0); // 0 = loading/checking resume
  const [isAuthed, setIsAuthed] = useState(false);

  // Step 1: signup state
  const [itsNumber, setItsNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cardFile, setCardFile] = useState<File | null>(null);

  // Step 2: phone & email state
  const [phone, setPhone] = useState('');
  const [countryCodeOption, setCountryCodeOption] = useState('+91');
  const [countryCodeCustom, setCountryCodeCustom] = useState('');
  const countryCode = countryCodeOption === 'Other' ? countryCodeCustom.trim() : countryCodeOption;
  const [email, setEmail] = useState('');

  // Step 3: basics state
  const [name, setName] = useState('');
  const [gender, setGender] = useState('female');
  const [dob, setDob] = useState('');
  const [city, setCity] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [photoPrivacyAllowedModes, setPhotoPrivacyAllowedModes] = useState<PhotoPrivacyMode[]>([]);
  const [photoPrivacyMode, setPhotoPrivacyMode] = useState<PhotoPrivacyMode>('three_then_request');
  const [jamaat, setJamaat] = useState('');
  const [education, setEducation] = useState('');
  const [educationOther, setEducationOther] = useState('');
  const [profession, setProfession] = useState('');
  const [professionOther, setProfessionOther] = useState('');
  const [heightCm, setHeightCm] = useState<number>(DEFAULT_HEIGHT_CM);
  // Website localization isn't live yet — default English, show
  // Gujarati/Urdu as visible-but-disabled (same gate as the marketing
  // site's NEXT_PUBLIC_LOCALIZATION_ENABLED).
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [willingToRelocate, setWillingToRelocate] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [brothersCount, setBrothersCount] = useState<number | null>(null);
  const [brothersMarriedCount, setBrothersMarriedCount] = useState<number | null>(null);
  const [sistersCount, setSistersCount] = useState<number | null>(null);
  const [sistersMarriedCount, setSistersMarriedCount] = useState<number | null>(null);
  const [hasChildren, setHasChildren] = useState<boolean | null>(null);
  const [childrenCount, setChildrenCount] = useState<number | null>(null);
  const [childrenBoysCount, setChildrenBoysCount] = useState<number | null>(null);
  const [childrenGirlsCount, setChildrenGirlsCount] = useState<number | null>(null);
  const [childrenLivingStatus, setChildrenLivingStatus] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [alias, setAlias] = useState('');

  // Step 5: bio state — mirrors mobile's onboarding/bio.tsx: auto-generate
  // on entry, offer Use this / Try another (capped) / Edit.
  const [bio, setBio] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioRerollCount, setBioRerollCount] = useState(0);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioInitialLoading, setBioInitialLoading] = useState(true);

  useEffect(() => {
    if (step === 6) {
      fetch('/api/v1/profile').then(r => r.json()).then(d => {
        if (d?.alias) setAlias(d.alias);
      }).catch(() => setAlias('Creative Architect'));
    }
  }, [step]);

  // RESUME LOGIC (checks profile on mount)
  useEffect(() => {
    checkResumeState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkResumeState = async () => {
    try {
      const res = await fetch('/api/v1/profile');
      if (res.status === 401) {
        setIsAuthed(false);
        setStep(1);
        return;
      }
      setIsAuthed(true);
      if (res.status === 404) {
        setStep(1);
        return;
      }

      const payload = await res.json();

      if (!payload.verification || payload.verification.status === 'none') {
        // Account exists but the card photo never successfully attached —
        // step 1 itself branches on isAuthed to show only the ITS+photo
        // retry form, not the password fields again.
        setStep(1);
      } else if (!payload.phone) {
        setStep(2);
      } else if (!payload.city || !payload.gender || payload.name === 'New User' || !payload.dob) {
        setStep(3);
      } else if (!payload.photoUri) {
        setStep(4);
      } else if (!payload.bio) {
        setStep(5);
      } else {
        setStep(6);
      }
    } catch (e) {
      setIsAuthed(false);
      setStep(1);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardFile) return;
    setIsLoading(true); setError('');

    try {
      if (!isAuthed) {
        const res = await fetch('/api/v1/auth/signup', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itsNumber, password }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.message || d.error || 'Failed to create account');
        }
        setIsAuthed(true);
      }

      // Reuse the existing authenticated ITS-card upload flow.
      const urlRes = await fetch('/api/v1/verification/upload-url', { method: 'POST' });
      const { uploadUrl, objectKey } = await urlRes.json();
      await fetch(uploadUrl, { method: 'PUT', body: cardFile });
      const confirmRes = await fetch('/api/v1/verification/its-card', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardImageKey: objectKey, itsNumber }),
      });
      if (!confirmRes.ok) {
        const d = await confirmRes.json().catch(() => ({}));
        throw new Error(d.message || d.error || 'ITS card upload failed');
      }
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); setError('');
    try {
      const res = await fetch('/api/v1/profile/basics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, countryCode, email }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || d.error || 'Failed to save');
      }
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBasicsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); setError('');
    try {
      // Backend accepts only DD/MM/YYYY (single wire format across every
      // client); the native <input type="date"> emits ISO YYYY-MM-DD.
      const [y, m, d] = dob.split('-');
      const dobFormatted = `${d}/${m}/${y}`;
      const res = await fetch('/api/v1/profile/basics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, gender, dob: dobFormatted, city, jamaat,
          latitude: latitude ?? undefined,
          longitude: longitude ?? undefined,
          education: education === 'Other' ? educationOther.trim() : (education || undefined),
          profession: profession === 'Other' ? professionOther.trim() : (profession || undefined),
          heightCm,
          preferredLanguage,
          willingToRelocate: willingToRelocate || undefined,
          maritalStatus: maritalStatus || undefined,
          brothersCount: brothersCount ?? undefined,
          brothersMarriedCount: brothersMarriedCount ?? undefined,
          sistersCount: sistersCount ?? undefined,
          sistersMarriedCount: sistersMarriedCount ?? undefined,
          hasChildren: hasChildren ?? undefined,
          childrenCount: childrenCount ?? undefined,
          childrenBoysCount: childrenBoysCount ?? undefined,
          childrenGirlsCount: childrenGirlsCount ?? undefined,
          childrenLivingStatus: childrenLivingStatus ?? undefined,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const dobIssue = errBody?.details?.dob?._errors?.[0];
        throw new Error(dobIssue || errBody.error || 'Failed to save basics');
      }
      setStep(4);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    setIsLoading(true); setError('');
    try {
      const res = await fetch('/api/v1/profile/photo/upload-url', { method: 'POST' });
      const { uploadUrl, objectKey } = await res.json();
      await fetch(uploadUrl, { method: 'PUT', body: file });
      const confirmRes = await fetch('/api/v1/profile/photo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoKey: objectKey }),
      });
      if (!confirmRes.ok) throw new Error('Photo save failed');
      await fetch('/api/v1/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoPrivacyMode }),
      });
      setStep(5);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // "inputs" is accepted but unused by the real endpoint — the actual
  // generation draws from profession/education/city already saved to the
  // profile (Step 3), not from anything passed in this request body.
  const generateBio = async (candidateIndex = 0) => {
    setBioLoading(true);
    try {
      const res = await fetch('/api/v1/profile/bio/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: {} }),
      });
      const data = await res.json();
      if (res.ok && data.candidates?.length) {
        setBio(data.candidates[candidateIndex % data.candidates.length].bio);
      } else {
        setBio('Tell us about yourself in a few words...');
      }
    } catch {
      setBio('Tell us about yourself in a few words...');
    } finally {
      setBioLoading(false);
      setBioInitialLoading(false);
    }
  };

  useEffect(() => {
    if (step === 5) {
      setBioInitialLoading(true);
      setBioRerollCount(0);
      setIsEditingBio(false);
      generateBio(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Same timing as mobile's onboarding/basics.tsx: kick off location capture
  // the moment this step mounts, not on submit — by the time the user
  // finishes this step's ~15 fields the browser prompt/lookup is already
  // resolved. Best-effort only, never blocks Continue.
  useEffect(() => {
    if (step !== 3) return;
    getOnboardingLocation().then((loc) => {
      if (!loc) return;
      setLatitude(loc.latitude);
      setLongitude(loc.longitude);
      if (loc.city) {
        setCity((prev) => (prev.trim().length === 0 ? loc.city! : prev));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step !== 4) return;
    fetch('/api/v1/profile/photo-privacy-options')
      .then((r) => r.json())
      .then((d) => {
        if (d.allowedModes) setPhotoPrivacyAllowedModes(d.allowedModes);
        if (d.defaultMode) setPhotoPrivacyMode(d.defaultMode);
      })
      .catch(() => {});
  }, [step]);

  const handleTryAnotherBio = async () => {
    if (bioRerollCount >= MAX_BIO_REROLLS) return;
    const next = bioRerollCount + 1;
    setBioRerollCount(next);
    await generateBio(next);
  };

  const saveBioAndAdvance = async () => {
    setBioLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/profile/bio', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio }),
      });
      if (!res.ok) throw new Error('Failed to save bio');
      setIsEditingBio(false);
      setStep(6);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBioLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setIsAuthed(false);
    setStep(1);
  };

  const strength = passwordStrength(password);
  const passwordValid = PASSWORD_REGEX.test(password);
  const passwordsMatch = password === confirmPassword;
  const step1Valid = isAuthed
    ? itsNumber.length === 8 && !!cardFile
    : itsNumber.length === 8 && passwordValid && passwordsMatch && !!cardFile;

  if (step === 0) {
    return <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div>;
  }

  return (
    <div className="bg-surface p-8 rounded-3xl shadow-sm border border-border max-w-md w-full animate-in fade-in zoom-in-95 duration-300">

      {/* Progress Bar */}
      {step < 6 && (
        <div className="flex gap-1 mb-6">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-border/50'}`} />
          ))}
        </div>
      )}

      {step > 0 && step < 6 && isAuthed && (
        <button onClick={handleLogout} className="text-xs text-muted mb-4 flex items-center gap-1 hover:text-danger">
          ← Log out and start over
        </button>
      )}

      {error && <div className="mb-4 p-3 bg-danger/10 text-danger rounded-xl text-sm border border-danger/20">{error}</div>}

      {step === 1 && (
        <form onSubmit={handleSignupSubmit}>
          <h2 className="text-2xl font-bold mb-2">{isAuthed ? 'Finish verifying your ITS card' : 'Create your account'}</h2>
          <p className="text-muted text-sm mb-6">
            {isAuthed ? 'Your account is ready — just upload your ITS card photo to continue.' : 'Verify your ITS number and set a password to get started.'}
          </p>
          <input type="text" required value={itsNumber} onChange={e => setItsNumber(e.target.value.replace(/\D/g, '').slice(0, 8))} maxLength={8} className="w-full px-4 py-3 rounded-xl border border-border bg-background mb-4" placeholder="ITS Number" />

          {!isAuthed && (
            <>
              <PasswordInput required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-background" wrapperClassName="relative mb-1" placeholder="Password" />
              {password.length > 0 && (
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                    <div className="h-1 rounded-full" style={{ width: `${(strength.score / 5) * 100}%`, backgroundColor: strength.color }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: strength.color }}>{strength.label}</span>
                </div>
              )}
              <p className="text-xs text-muted mb-4">At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a symbol.</p>
              <PasswordInput required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-background" wrapperClassName="relative mb-1" placeholder="Confirm password" />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-danger mb-4">Passwords do not match.</p>
              )}
              {(confirmPassword.length === 0 || passwordsMatch) && <div className="mb-4" />}
            </>
          )}

          <p className="text-xs text-muted mb-2">
            Take a selfie holding your ITS card — make sure both your face and the card details are clearly visible.
          </p>
          <ImageUploadWithCrop
            onImageReady={setCardFile}
            triggerLabel="Upload selfie with ITS Card"
            fileName="its-card.jpg"
            disabled={isLoading || itsNumber.length !== 8}
          />

          <button type="submit" disabled={isLoading || !step1Valid} className="w-full bg-primary text-surface font-bold py-4 rounded-xl mt-6 disabled:opacity-50">
            {isLoading ? 'Creating account...' : isAuthed ? 'Upload & continue' : 'Create account'}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handlePhoneEmailSubmit}>
          <h2 className="text-2xl font-bold mb-2">Contact details</h2>
          <p className="text-muted text-sm mb-6">We'll use these to keep your account secure and reachable.</p>
          <div className="mb-4">
            <h3 className="text-sm font-bold text-foreground mb-2">Country code</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {COUNTRY_CODE_OPTIONS.map(opt => (
                <Chip key={opt} label={opt} selected={countryCodeOption === opt} onClick={() => setCountryCodeOption(opt)} />
              ))}
            </div>
            {countryCodeOption === 'Other' && (
              <input
                type="text" required value={countryCodeCustom}
                onChange={(e) => setCountryCodeCustom(e.target.value.replace(/[^\d+]/g, '').slice(0, 5))}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background mb-2"
                placeholder="+61"
              />
            )}
            <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 14))} className="w-full px-4 py-3 rounded-xl border border-border bg-background" placeholder="98765 43210" />
          </div>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-background mb-1" placeholder="you@example.com" />
          {email.length > 0 && !EMAIL_REGEX.test(email) && (
            <p className="text-xs text-danger mb-4">Please enter a valid email address.</p>
          )}
          {(email.length === 0 || EMAIL_REGEX.test(email)) && <div className="mb-4" />}
          <button disabled={isLoading} className="w-full bg-primary text-surface font-bold py-4 rounded-xl">{isLoading ? 'Saving...' : 'Continue'}</button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleBasicsSubmit}>
          <h2 className="text-2xl font-bold mb-6">Basic Info</h2>
          <div className="space-y-4">
            <div>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-background" placeholder="Full Name" />
              <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start gap-2 text-left">
                <svg className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-bold text-xs text-indigo-900 mb-0.5">Alias & Privacy Protected</h4>
                  <p className="text-xs text-indigo-700 leading-relaxed">
                    Your real name stays private — we assign you a unique, dignified alias (e.g., "Creative Architect") to browse with. Your identity is only revealed once you and a match both mutually express interest!
                  </p>
                </div>
              </div>
            </div>
            <select value={gender} onChange={e => setGender(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-background">
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
            <input
              type="date"
              required
              value={dob}
              onChange={e => setDob(e.target.value)}
              min={new Date(new Date().setFullYear(new Date().getFullYear() - 100)).toISOString().slice(0, 10)}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().slice(0, 10)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background"
            />
            <p className="text-xs text-muted -mt-2">Minimum age: 18 (female) / 20 (male)</p>
            <input type="text" required value={city} onChange={e => setCity(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-background" placeholder="City (e.g. Mumbai)" />
            <input type="text" required value={jamaat} onChange={e => setJamaat(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-background" placeholder="Jamaat" />

            <div>
              <h3 className="text-sm font-bold text-foreground mb-2">Height</h3>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {HEIGHT_PICKER_OPTIONS.map(opt => (
                  <Chip key={opt.cm} label={opt.label} selected={heightCm === opt.cm} onClick={() => setHeightCm(opt.cm)} className="shrink-0" />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-foreground mb-2">Education</h3>
              <div className="flex flex-wrap gap-2">
                {EDUCATION_OPTIONS.map(opt => (
                  <Chip key={opt} label={opt} selected={education === opt} onClick={() => setEducation(opt)} />
                ))}
              </div>
              {education === 'Other' && (
                <input
                  type="text" required maxLength={100} value={educationOther}
                  onChange={e => setEducationOther(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background mt-2"
                  placeholder="Your education"
                />
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-foreground mb-2">Profession</h3>
              <div className="flex flex-wrap gap-2">
                {PROFESSION_OPTIONS.map(opt => (
                  <Chip key={opt} label={opt} selected={profession === opt} onClick={() => setProfession(opt)} />
                ))}
              </div>
              {profession === 'Other' && (
                <input
                  type="text" required maxLength={100} value={professionOther}
                  onChange={e => setProfessionOther(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background mt-2"
                  placeholder="Your profession"
                />
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-foreground mb-2">Preferred Language for Updates</h3>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map(opt => (
                  <Chip
                    key={opt.value} label={opt.label}
                    selected={preferredLanguage === opt.value}
                    disabled={opt.value !== 'en'}
                    onClick={() => setPreferredLanguage(opt.value)}
                  />
                ))}
              </div>
              <p className="text-xs text-muted mt-1">Gujarati and Urdu are coming soon — English only for now.</p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-foreground mb-2">Willing to Relocate?</h3>
              <div className="flex flex-wrap gap-2">
                {RELOCATE_OPTIONS.map(opt => (
                  <Chip key={opt.value} label={opt.label} selected={willingToRelocate === opt.value} onClick={() => setWillingToRelocate(opt.value)} />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-foreground mb-2">Marital Status</h3>
              <div className="flex flex-wrap gap-2">
                {MARITAL_STATUSES.map(opt => (
                  <Chip key={opt.value} label={opt.label} selected={maritalStatus === opt.value} onClick={() => setMaritalStatus(opt.value)} />
                ))}
              </div>
            </div>

            <FamilySection
              brothersCount={brothersCount}
              brothersMarriedCount={brothersMarriedCount}
              sistersCount={sistersCount}
              sistersMarriedCount={sistersMarriedCount}
              onChange={(updates) => {
                if ('brothersCount' in updates) setBrothersCount(updates.brothersCount ?? null);
                if ('brothersMarriedCount' in updates) setBrothersMarriedCount(updates.brothersMarriedCount ?? null);
                if ('sistersCount' in updates) setSistersCount(updates.sistersCount ?? null);
                if ('sistersMarriedCount' in updates) setSistersMarriedCount(updates.sistersMarriedCount ?? null);
              }}
            />

            <ChildrenSection
              maritalStatus={maritalStatus}
              hasChildren={hasChildren}
              childrenCount={childrenCount}
              childrenBoysCount={childrenBoysCount}
              childrenGirlsCount={childrenGirlsCount}
              childrenLivingStatus={childrenLivingStatus as any}
              onChange={(updates) => {
                if ('hasChildren' in updates) setHasChildren(updates.hasChildren ?? null);
                if ('childrenCount' in updates) setChildrenCount(updates.childrenCount ?? null);
                if ('childrenBoysCount' in updates) setChildrenBoysCount(updates.childrenBoysCount ?? null);
                if ('childrenGirlsCount' in updates) setChildrenGirlsCount(updates.childrenGirlsCount ?? null);
                if ('childrenLivingStatus' in updates) setChildrenLivingStatus(updates.childrenLivingStatus ?? null);
              }}
            />
          </div>
          <button disabled={isLoading} className="w-full bg-primary text-surface font-bold py-4 rounded-xl mt-6">{isLoading ? 'Saving...' : 'Continue'}</button>
        </form>
      )}

      {step === 4 && (
        <div>
          <h2 className="text-2xl font-bold mb-2">Profile Photo</h2>
          <p className="text-muted text-sm mb-6">Photos are heavily blurred by default and fully protected.</p>
          <ImageUploadWithCrop
            onImageReady={handlePhotoUpload}
            aspect={4 / 5}
            triggerLabel="Click to upload photo"
            fileName="profile-photo.jpg"
            disabled={isLoading}
          />
          {isLoading && <p className="text-center text-sm text-primary mt-4 animate-pulse">Uploading...</p>}

          {photoPrivacyAllowedModes.length > 0 && (
            <div className="mt-6 text-left">
              <h3 className="text-sm font-bold text-foreground mb-1">Photo privacy</h3>
              <p className="text-xs text-muted mb-3">Choose who can see your photo, and how. You can change this anytime.</p>
              <PhotoPrivacyPicker value={photoPrivacyMode} onChange={setPhotoPrivacyMode} allowedModes={photoPrivacyAllowedModes} disabled={isLoading} />
            </div>
          )}
        </div>
      )}

      {step === 5 && (
        <div>
          <h2 className="text-2xl font-bold mb-2">Your bio</h2>
          {bioInitialLoading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
              <p className="text-muted text-sm">Crafting your bio...</p>
            </div>
          ) : isEditingBio ? (
            <>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                maxLength={300}
                rows={5}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background mb-1"
              />
              <p className="text-xs text-muted mb-4">{bio.length}/300 characters</p>
              <button
                onClick={saveBioAndAdvance}
                disabled={bioLoading || bio.length < 20}
                className="w-full bg-primary text-surface font-bold py-4 rounded-xl mb-2 disabled:opacity-50"
              >
                {bioLoading ? 'Saving...' : 'Save & continue'}
              </button>
              <button onClick={() => setIsEditingBio(false)} className="w-full text-muted text-sm py-2">Cancel</button>
            </>
          ) : (
            <>
              <p className="text-muted mb-4 text-sm">We wrote something for you — use it as-is, try another, or edit it yourself.</p>
              <div className="bg-background border border-border rounded-xl p-4 mb-4">
                <p className="text-sm text-foreground leading-relaxed">{bio}</p>
              </div>
              <button
                onClick={saveBioAndAdvance}
                disabled={bioLoading}
                className="w-full bg-primary text-surface font-bold py-4 rounded-xl mb-2 disabled:opacity-50"
              >
                {bioLoading ? 'Saving...' : '✓ Use this'}
              </button>
              {bioRerollCount < MAX_BIO_REROLLS ? (
                <button
                  onClick={handleTryAnotherBio}
                  disabled={bioLoading}
                  className="w-full bg-secondary text-foreground font-medium py-3 rounded-xl mb-2 disabled:opacity-50"
                >
                  ↻ Try another ({MAX_BIO_REROLLS - bioRerollCount} left)
                </button>
              ) : (
                <div className="bg-accent-light text-primary text-xs text-center py-2.5 rounded-xl mb-2">
                  No more auto-generated options — tap Edit to write your own
                </div>
              )}
              <button onClick={() => setIsEditingBio(true)} className="w-full text-muted text-sm py-2">✏️ Edit</button>
            </>
          )}
        </div>
      )}

      {step === 6 && (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-accent-light text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">You're all set!</h2>
          <p className="text-muted mb-6">Your account has been created.</p>

          {alias && (
            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-6 text-center my-6">
              <h4 className="font-bold text-xs text-indigo-800 uppercase tracking-wider mb-1">✨ Your Assigned Profile Alias ✨</h4>
              <div className="font-bold text-2xl text-indigo-950 my-2">{alias}</div>
              <p className="text-xs text-indigo-900 leading-relaxed mt-2">
                Your real name stays private while browsing. Other users will only see this alias until you both mutually match. You can change this anytime in Settings!
              </p>
            </div>
          )}

          <button onClick={() => router.push(postAuthPath)} className="w-full bg-primary text-surface font-medium py-4 rounded-xl flex items-center justify-center gap-2 mb-3">Start Browsing</button>
        </div>
      )}

    </div>
  );
}

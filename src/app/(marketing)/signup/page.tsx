'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useModeContext } from '@/lib/context/ModeContext';
import { PasswordInput } from '@/components/ui/PasswordInput';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [countryCode, setCountryCode] = useState('+91');
  const [email, setEmail] = useState('');

  // Step 3: basics state
  const [name, setName] = useState('');
  const [gender, setGender] = useState('female');
  const [dob, setDob] = useState('');
  const [city, setCity] = useState('');
  const [jamaat, setJamaat] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [alias, setAlias] = useState('');

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
        body: JSON.stringify({ name, gender, dob: dobFormatted, city, jamaat }),
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      setStep(5);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
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

          <label className={`block w-full border-2 border-dashed border-border rounded-2xl p-12 text-center transition-colors ${itsNumber.length === 8 ? 'cursor-pointer hover:border-primary/50' : 'opacity-50 cursor-not-allowed'}`}>
            <span className="text-sm font-medium">{cardFile ? cardFile.name : 'Upload ID Card Photo'}</span>
            <input type="file" accept="image/*" className="hidden" disabled={isLoading || itsNumber.length !== 8} onChange={(e) => setCardFile(e.target.files?.[0] ?? null)} />
          </label>

          <button type="submit" disabled={isLoading || !step1Valid} className="w-full bg-primary text-surface font-bold py-4 rounded-xl mt-6 disabled:opacity-50">
            {isLoading ? 'Creating account...' : isAuthed ? 'Upload & continue' : 'Create account'}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handlePhoneEmailSubmit}>
          <h2 className="text-2xl font-bold mb-2">Contact details</h2>
          <p className="text-muted text-sm mb-6">We'll use these to keep your account secure and reachable.</p>
          <div className="flex gap-2 mb-4">
            <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="px-3 py-3 rounded-xl border border-border bg-background">
              <option value="+91">+91</option>
              <option value="+971">+971</option>
              <option value="+1">+1</option>
              <option value="+44">+44</option>
              <option value="+92">+92</option>
            </select>
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
          </div>
          <button disabled={isLoading} className="w-full bg-primary text-surface font-bold py-4 rounded-xl mt-6">{isLoading ? 'Saving...' : 'Continue'}</button>
        </form>
      )}

      {step === 4 && (
        <div>
          <h2 className="text-2xl font-bold mb-2">Profile Photo</h2>
          <p className="text-muted text-sm mb-6">Photos are heavily blurred by default and fully protected.</p>
          <label className="block w-full border-2 border-dashed border-border rounded-2xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-accent-light/10 transition-colors">
            <svg className="w-8 h-8 mx-auto mb-3 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            <span className="text-sm font-medium text-foreground">Click to upload photo</span>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isLoading} />
          </label>
          {isLoading && <p className="text-center text-sm text-primary mt-4 animate-pulse">Uploading...</p>}
        </div>
      )}

      {step === 5 && (
        <div>
          <h2 className="text-2xl font-bold mb-6">Your Bio</h2>
          <p className="text-muted mb-6 text-sm">Our AI can write this for you in the mobile app. For now, skip to finish.</p>
          <button onClick={() => setStep(6)} className="w-full bg-primary text-surface font-bold py-4 rounded-xl">Skip to finish</button>
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

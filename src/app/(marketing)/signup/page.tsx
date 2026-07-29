'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

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

function SignupWizard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState<number>(0); // 0 = loading/checking resume
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  
  // Basics state
  const [name, setName] = useState('');
  const [gender, setGender] = useState('female');
  const [dob, setDob] = useState('');
  const [city, setCity] = useState('');
  const [jamaat, setJamaat] = useState('');

  // ITS Verification state
  const [itsNumber, setItsNumber] = useState('');
  
  // Preferences state
  const [ageMin, setAgeMin] = useState(25);
  const [ageMax, setAgeMax] = useState(30);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [alias, setAlias] = useState('');

  useEffect(() => {
    if (step === 9) {
      fetch('/api/v1/profile').then(r => r.json()).then(d => {
        if (d?.alias) setAlias(d.alias);
      }).catch(() => setAlias('Creative Architect'));
    }
  }, [step]);

  // 1. RESUME LOGIC (Checks profile on mount)
  useEffect(() => {
    checkResumeState();
  }, []);

  const checkResumeState = async () => {
    try {
      const res = await fetch('/api/v1/profile');
      if (res.status === 401 || res.status === 404) {
        // Not auth'd or no basics -> start at step 1
        // (If 404, we technically could skip OTP, but we need phone from OTP anyway, or just send them to basics if we knew they were auth'd. But 404 from GET /api/v1/profile actually means profile row missing. If they are auth'd but no profile, we should push to Basics (Step 3). We can check if they have a token).
        // Actually, if 404, the user exists but profile row might be missing. The backend GET /api/v1/profile returns 404 if profile is missing.
        if (res.status === 404) {
          setStep(3); // Go to basics
        } else {
          setStep(1); // Go to phone
        }
        return;
      }

      const payload = await res.json();
      
      // Determine step based on payload
      if (!payload.city || !payload.gender || payload.name === 'New User') {
        setStep(3);
      } else if (!payload.photoUri) {
        setStep(4);
      } else if (payload.verification?.status === 'none') {
        setStep(5);
      } else if (!payload.preferences || !payload.preferences.ageRange?.min) {
        setStep(6);
      } else if (!payload.bio) {
        setStep(7);
      } else if (!payload.passwordHash && false /* assume true for now, can't check hash directly */) {
        setStep(8); // Backend doesn't expose password hash status. If we reach here, we'll send to 8, then 9 if done.
      } else {
        // If we can't be sure about password, just go to password. Or if they are fully done, go to step 9.
        setStep(8); 
      }
    } catch (e) {
      setStep(1);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); setError('');
    try {
      const res = await fetch('/api/v1/auth/otp/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) throw new Error('Failed to send OTP');
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); setError('');
    try {
      const res = await fetch('/api/v1/auth/otp/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Invalid OTP');
      }
      // Cookie is set! Check resume state to jump to right step.
      await checkResumeState();
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
      const res = await fetch('/api/v1/profile/basics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, gender, dob, city, jamaat }),
      });
      if (!res.ok) throw new Error('Failed to save basics');
      setStep(4);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isVerification = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true); setError('');
    try {
      const urlEndpoint = isVerification ? '/api/v1/verification/upload-url' : '/api/v1/profile/photo/upload-url';
      
      const res = await fetch(urlEndpoint, { method: 'POST' });
      const { uploadUrl, objectKey } = await res.json();

      // PUT to R2
      await fetch(uploadUrl, { method: 'PUT', body: file });

      // Confirm
      if (isVerification) {
        const confirmRes = await fetch('/api/v1/verification/its-card', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardImageKey: objectKey, itsNumber }),
        });
        if (!confirmRes.ok) throw new Error('Verification failed');
        setStep(6);
      } else {
        const confirmRes = await fetch('/api/v1/profile/photo', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoKey: objectKey }),
        });
        if (!confirmRes.ok) throw new Error('Photo save failed');
        setStep(5);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); setError('');
    try {
      const res = await fetch('/api/v1/profile/preferences', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ageRange: { min: ageMin, max: ageMax } }),
      });
      if (!res.ok) throw new Error('Failed to save preferences');
      setStep(7);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const [password, setPassword] = useState('');
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); setError('');
    try {
      const res = await fetch('/api/v1/auth/password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error('Failed to set password');
      setStep(9); // Done!
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 0) {
    return <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div>;
  }

  return (
    <div className="bg-surface p-8 rounded-3xl shadow-sm border border-border max-w-md w-full animate-in fade-in zoom-in-95 duration-300">
      
      {/* Progress Bar */}
      {step < 9 && (
        <div className="flex gap-1 mb-6">
          {[1,2,3,4,5,6,7,8].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-border/50'}`} />
          ))}
        </div>
      )}

      {error && <div className="mb-4 p-3 bg-danger/10 text-danger rounded-xl text-sm border border-danger/20">{error}</div>}

      {step === 1 && (
        <form onSubmit={handlePhoneSubmit}>
          <h2 className="text-2xl font-bold mb-6">What's your phone number?</h2>
          <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-background mb-4" placeholder="+91 98765 43210" />
          <button disabled={isLoading} className="w-full bg-primary text-surface font-bold py-4 rounded-xl">{isLoading ? 'Sending...' : 'Continue'}</button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleOtpSubmit}>
          <h2 className="text-2xl font-bold mb-2">Enter OTP</h2>
          <p className="text-muted mb-6 text-sm">Sent to {phone}</p>
          <input type="text" required value={code} onChange={(e) => setCode(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-background mb-4 text-center tracking-widest text-xl" placeholder="000000" maxLength={6} />
          <button disabled={isLoading} className="w-full bg-primary text-surface font-bold py-4 rounded-xl">{isLoading ? 'Verifying...' : 'Verify OTP'}</button>
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
            <input type="date" required value={dob} onChange={e => setDob(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-background" />
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
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, false)} disabled={isLoading} />
          </label>
          {isLoading && <p className="text-center text-sm text-primary mt-4 animate-pulse">Uploading...</p>}
        </div>
      )}

      {step === 5 && (
        <div>
          <h2 className="text-2xl font-bold mb-2">ITS Verification</h2>
          <p className="text-muted text-sm mb-6">Upload a photo of your ITS card.</p>
          <input type="text" required value={itsNumber} onChange={e => setItsNumber(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-background mb-4" placeholder="ITS Number" />
          <label className={`block w-full border-2 border-dashed border-border rounded-2xl p-12 text-center transition-colors ${itsNumber.length === 8 ? 'cursor-pointer hover:border-primary/50' : 'opacity-50 cursor-not-allowed'}`}>
            <span className="text-sm font-medium">Upload ID Card Photo</span>
            <input type="file" accept="image/*" className="hidden" disabled={isLoading || itsNumber.length !== 8} onChange={(e) => handleFileUpload(e, true)} />
          </label>
          {isLoading && <p className="text-center text-sm text-primary mt-4 animate-pulse">Uploading...</p>}
        </div>
      )}

      {step === 6 && (
        <form onSubmit={handlePreferencesSubmit}>
          <h2 className="text-2xl font-bold mb-6">Preferences</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm text-muted mb-1">Min Age</label>
              <input type="number" value={ageMin} onChange={e => setAgeMin(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-border bg-background" />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Max Age</label>
              <input type="number" value={ageMax} onChange={e => setAgeMax(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-border bg-background" />
            </div>
          </div>
          <button disabled={isLoading} className="w-full bg-primary text-surface font-bold py-4 rounded-xl">{isLoading ? 'Saving...' : 'Continue'}</button>
        </form>
      )}

      {step === 7 && (
        <div>
          <h2 className="text-2xl font-bold mb-6">Your Bio</h2>
          <p className="text-muted mb-6 text-sm">Our AI can write this for you in the mobile app. For now, skip to password creation.</p>
          <button onClick={() => setStep(8)} className="w-full bg-primary text-surface font-bold py-4 rounded-xl">Skip to Password</button>
        </div>
      )}

      {step === 8 && (
        <form onSubmit={handlePasswordSubmit}>
          <h2 className="text-2xl font-bold mb-6">Create Password</h2>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-background mb-4" placeholder="Minimum 8 characters" />
          <button disabled={isLoading} className="w-full bg-primary text-surface font-bold py-4 rounded-xl">{isLoading ? 'Saving...' : 'Finish Signup'}</button>
        </form>
      )}

      {step === 9 && (
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

          <button onClick={() => router.push('/dashboard')} className="w-full bg-primary text-surface font-medium py-4 rounded-xl flex items-center justify-center gap-2 mb-3">View Dashboard</button>
        </div>
      )}

    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useModeContext } from '@/lib/context/ModeContext';

export function Header() {
  const { mode } = useModeContext();
  const postAuthPath = mode === 'B' ? '/profile' : '/discover';
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [itsNumber, setItsNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<0 | 1 | 2>(0);
  const [resetItsNumber, setResetItsNumber] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/v1/auth/me')
      .then(res => res.json())
      .then(data => {
        setIsAuthenticated(data.authenticated);
        if (data.photoUri) setPhotoUri(data.photoUri);
      })
      .catch(() => setIsAuthenticated(false));
  }, []);

  // A gated page (e.g. /discover) redirected here with ?redirect=<path> when the
  // visitor wasn't logged in — auto-open the login modal and remember where to
  // send them back to after a successful login, instead of dropping them on a
  // bare homepage they'd have to find the login button on themselves.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect) {
      setRedirectTarget(redirect);
      setIsLoginModalOpen(true);
    }
  }, []);

  const handleLogout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    setIsAuthenticated(false);
    router.push('/');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itsNumber, password }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setIsSuccess(true);
        router.push(redirectTarget || postAuthPath);
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/auth/password/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itsNumber: resetItsNumber }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetMessage(data.message);
        setForgotPasswordStep(2);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/auth/password/reset-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itsNumber: resetItsNumber, otp: resetOtp, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setForgotPasswordStep(0);
        setResetItsNumber('');
        setResetOtp('');
        setNewPassword('');
        setResetMessage('Password reset successful. Please log in.');
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center" style={{ gap: '14px' }}>
            <img src="/logo-light.svg" alt="" width={48} height={63} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{
                fontFamily: 'Georgia, serif',
                fontSize: '22px',
                fontWeight: 500,
                color: '#211F1A',
                lineHeight: 1.1
              }}>
                Bohra Taaruf
              </span>
              <span style={{
                fontFamily: 'Georgia, serif',
                fontSize: '13px',
                fontStyle: 'italic',
                color: '#8C6A3F',
                lineHeight: 1.2
              }}>
                Through the right door, together
              </span>
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/about" className="text-sm font-medium text-muted hover:text-foreground transition-colors">About Us</Link>
            <Link href="/#how-it-works" className="text-sm font-medium text-muted hover:text-foreground transition-colors">How it works</Link>
            <Link href="/#features" className="text-sm font-medium text-muted hover:text-foreground transition-colors">Features</Link>
            <Link href="/contact" className="text-sm font-medium text-muted hover:text-foreground transition-colors">Contact</Link>
          </nav>
          
          <div className="flex items-center gap-4">
            {isAuthenticated === null ? (
              <div className="w-20 h-10 animate-pulse bg-muted/20 rounded-full" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-6">
                <Link
                  href={postAuthPath}
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  {mode === 'B' ? 'Profile' : 'Discover'}
                </Link>
                
                <div className="relative group">
                  <button className="flex items-center gap-2 focus:outline-none">
                    <div className="w-10 h-10 rounded-full bg-muted/20 border border-border overflow-hidden flex items-center justify-center shrink-0">
                      {photoUri ? (
                        <img src={photoUri} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-muted" />
                      )}
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted group-hover:text-foreground transition-colors" />
                  </button>
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right scale-95 group-hover:scale-100 z-50">
                    <div className="p-2 space-y-1">
                      <Link href="/profile" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-accent-light/30 rounded-xl transition-colors">
                        <User className="w-4 h-4 text-primary" />
                        Edit Profile
                      </Link>
                      <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-accent-light/30 rounded-xl transition-colors">
                        <Settings className="w-4 h-4 text-primary" />
                        Settings
                      </Link>
                      <div className="h-[1px] bg-border my-1 mx-2" />
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-danger hover:bg-danger/10 rounded-xl transition-colors text-left">
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <button 
                  onClick={() => setIsLoginModalOpen(true)}
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors px-4 py-2"
                >
                  Log in
                </button>
                <Link 
                  href="/signup" 
                  className="text-sm font-medium bg-primary text-surface px-6 py-2.5 rounded-full hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Lightweight Login Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-foreground">
                  {forgotPasswordStep === 1 ? 'Reset Password' : forgotPasswordStep === 2 ? 'Verify & Reset' : 'Welcome back'}
                </h2>
                <button 
                  onClick={() => {
                    setIsLoginModalOpen(false);
                    setForgotPasswordStep(0);
                  }}
                  className="p-2 text-muted hover:bg-accent-light/50 rounded-full transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              
              {isSuccess ? (
                <div className="text-center py-8 animate-in fade-in zoom-in-95">
                  <div className="w-16 h-16 bg-accent-light text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">You're logged in!</h3>
                  <p className="text-muted">
                    Your session is secure.
                  </p>
                  <button 
                    onClick={() => setIsLoginModalOpen(false)}
                    className="mt-8 w-full bg-primary text-surface font-medium py-3 rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : forgotPasswordStep === 1 ? (
                <form onSubmit={handleResetRequest}>
                  <div className="space-y-4">
                    <p className="text-sm text-muted">Enter your ITS Number to receive a password reset OTP on your registered mobile number.</p>
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1.5">ITS Number</label>
                      <input 
                        type="text" 
                        required
                        value={resetItsNumber}
                        onChange={(e) => setResetItsNumber(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-background text-foreground"
                        placeholder="Enter your ITS number"
                      />
                    </div>
                    {error && <p className="text-danger text-sm">{error}</p>}
                    
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-primary text-surface font-medium py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? 'Sending...' : 'Send OTP'}
                    </button>
                  </div>
                  <button type="button" onClick={() => { setForgotPasswordStep(0); setError(''); }} className="mt-4 w-full text-center text-sm text-muted hover:text-foreground">
                    Back to login
                  </button>
                </form>
              ) : forgotPasswordStep === 2 ? (
                <form onSubmit={handleResetConfirm}>
                  <div className="space-y-4">
                    {resetMessage && <p className="text-primary text-sm text-center mb-4">{resetMessage}</p>}
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1.5">6-Digit OTP</label>
                      <input 
                        type="text" 
                        required
                        maxLength={6}
                        value={resetOtp}
                        onChange={(e) => setResetOtp(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-background text-foreground"
                        placeholder="000000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1.5">New Password</label>
                      <input 
                        type="password" 
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-background text-foreground"
                        placeholder="At least 6 characters"
                      />
                    </div>
                    {error && <p className="text-danger text-sm">{error}</p>}
                    
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-primary text-surface font-medium py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </div>
                  <button type="button" onClick={() => { setForgotPasswordStep(0); setError(''); }} className="mt-4 w-full text-center text-sm text-muted hover:text-foreground">
                    Cancel
                  </button>
                </form>
              ) : (
                <form onSubmit={handleLogin}>
                  <div className="space-y-4">
                    {resetMessage && <p className="text-primary text-sm text-center mb-4">{resetMessage}</p>}
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1.5">ITS Number</label>
                      <input 
                        type="text" 
                        required
                        value={itsNumber}
                        onChange={(e) => setItsNumber(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-background text-foreground"
                        placeholder="Enter your ITS number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1.5">Password</label>
                      <input 
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-background text-foreground"
                        placeholder="Enter your password"
                      />
                    </div>
                    
                    {error && <p className="text-danger text-sm">{error}</p>}
                    
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-primary text-surface font-medium py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? 'Signing in...' : 'Sign in'}
                    </button>
                  </div>
                  
                  <div className="mt-4 flex justify-between items-center text-sm">
                    <button type="button" onClick={() => { setForgotPasswordStep(1); setError(''); setResetMessage(''); }} className="text-muted hover:text-primary transition-colors">
                      Forgot password?
                    </button>
                  </div>

                  <p className="mt-6 text-center text-sm text-muted">
                    Don't have an account? <Link href="/signup" onClick={() => setIsLoginModalOpen(false)} className="text-primary font-medium hover:underline">Sign up</Link>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

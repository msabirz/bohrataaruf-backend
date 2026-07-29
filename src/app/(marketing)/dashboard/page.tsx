'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Lock, Apple, PlaySquare } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';

type Candidate = {
  profileId: string;
  alias: string;
  age: number;
  city: string;
  education: string;
  profession: string;
  matchPercentage: number;
};

export default function DashboardPage() {
  const [status, setStatus] = useState<'loading' | 'unverified' | 'verified' | 'error'>('loading');
  const [verificationData, setVerificationData] = useState<any>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  
  // Filters state
  const [ageMin, setAgeMin] = useState<number | ''>('');
  const [ageMax, setAgeMax] = useState<number | ''>('');
  const [cityFilter, setCityFilter] = useState('');
  const [isFetchingCandidates, setIsFetchingCandidates] = useState(false);

  const filterByAge = (min: number | '', max: number | '') => {
    setAgeMin(min);
    setAgeMax(max);
    fetchCandidates({ ageMin: min, ageMax: max, city: cityFilter });
  };

  const filterByCity = (city: string) => {
    const newCity = cityFilter === city ? '' : city;
    setCityFilter(newCity);
    fetchCandidates({ ageMin, ageMax, city: newCity });
  };

  useEffect(() => {
    let isMounted = true;
    
    async function loadDashboard() {
      try {
        // 1. Check Verification
        const verRes = await fetch('/api/v1/verification/status');
        if (!verRes.ok) {
          if (verRes.status === 401) window.location.href = '/';
          throw new Error('Failed to load status');
        }
        
        const verData = await verRes.json();
        if (!isMounted) return;
        
        setVerificationData(verData);

        if (verData.status === 'verified') {
          setStatus('verified');
          fetchCandidates(undefined, true);
        } else {
          setStatus('unverified');
        }
      } catch (err) {
        if (isMounted) setStatus('error');
      }
    }

    loadDashboard();
    return () => { isMounted = false; };
  }, []);

  const fetchCandidates = async (customFilters?: { ageMin?: number | '', ageMax?: number | '', city?: string }, isInitialLoad: boolean = false) => {
    setIsFetchingCandidates(true);
    try {
      const filters = customFilters || { ageMin, ageMax, city: cityFilter };
      
      const payload: any = { limit: 4, teaser: true };
      
      // If it's not the initial load, explicitly send filters (using null for 'Any')
      if (!isInitialLoad) {
        payload.filters = {
          ageMin: filters.ageMin === '' ? null : filters.ageMin,
          ageMax: filters.ageMax === '' ? null : filters.ageMax,
          city: filters.city === '' ? null : filters.city,
        };
      }

      console.log('[fetchCandidates] Sending Payload:', payload);

      const res = await fetch('/api/v1/matching/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      console.log('[fetchCandidates] Response Status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingCandidates(false);
    }
  };

  const StoreBadges = () => (
    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
      <Link href="#" className="flex items-center gap-2 bg-foreground text-surface px-6 py-3 rounded-xl hover:bg-foreground/90 transition-colors">
        <Apple className="w-6 h-6" />
        <div className="text-left">
          <div className="text-[10px] leading-none opacity-80">Download on the</div>
          <div className="font-semibold text-sm leading-none mt-1">App Store</div>
        </div>
      </Link>
      <Link href="#" className="flex items-center gap-2 bg-foreground text-surface px-6 py-3 rounded-xl hover:bg-foreground/90 transition-colors">
        <PlaySquare className="w-6 h-6" />
        <div className="text-left">
          <div className="text-[10px] leading-none opacity-80">GET IT ON</div>
          <div className="font-semibold text-sm leading-none mt-1">Google Play</div>
        </div>
      </Link>
    </div>
  );

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'unverified') {
    return (
      <div className="min-h-screen bg-background pt-24 pb-32 px-6">
        <div className="container mx-auto max-w-lg text-center">
          <div className="bg-surface p-8 rounded-3xl border border-border shadow-sm">
            <h1 className="text-2xl font-bold mb-4">Verification Status</h1>
            
            {verificationData?.status === 'pending' && (
              <>
                <div className="w-16 h-16 bg-accent-light text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h2 className="text-xl font-semibold mb-2 text-primary">Under Review</h2>
                <p className="text-muted mb-8">Your ITS verification is currently being reviewed by our team. This usually takes 24-48 hours.</p>
              </>
            )}

            {verificationData?.status === 'rejected' && (
              <>
                <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </div>
                <h2 className="text-xl font-semibold mb-2 text-danger">Verification Failed</h2>
                <p className="text-muted mb-4">We were unable to verify your identity.</p>
                {verificationData.rejectionReason && (
                  <div className="bg-background p-4 rounded-xl border border-border text-sm text-left mb-8">
                    <strong>Reason:</strong> {verificationData.rejectionReason}
                  </div>
                )}
              </>
            )}

            {(verificationData?.status === 'none' || !verificationData?.status) && (
              <>
                <div className="w-16 h-16 bg-border text-muted rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Not Verified</h2>
                <p className="text-muted mb-8">You need to complete ITS verification to access the platform.</p>
              </>
            )}

            <div className="pt-8 border-t border-border">
              <p className="font-semibold text-foreground mb-4">Continue in the app to track your status</p>
              <StoreBadges />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-32 px-6">
      <div className="container mx-auto max-w-5xl">
        
        <div className="text-center mb-16">
          <span className="inline-block py-1 px-3 rounded-full bg-accent-light/50 text-primary font-medium text-xs mb-4 border border-accent/20 tracking-wide uppercase">
            Preview Mode
          </span>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Welcome to {process.env.NEXT_PUBLIC_APP_DISPLAY_NAME ?? 'Bohra Taaruf'}</h1>
          <p className="text-lg text-muted max-w-2xl mx-auto mb-8">
            Your profile is verified! Here is a sneak peek at some of your top matches. 
            Continue in the mobile app for the full experience.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/dashboard/edit" className="text-sm font-medium bg-surface text-foreground border border-border px-6 py-2.5 rounded-full hover:bg-muted/10 transition-colors shadow-sm">
              Edit My Profile
            </Link>
          </div>
        </div>

        {/* Read-Only Teaser Filters */}
        <div className="bg-surface p-6 rounded-3xl border border-border mb-12 shadow-sm max-w-4xl mx-auto flex flex-col gap-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <span className="text-sm font-medium text-muted w-24 shrink-0">Age Range</span>
            <div className="flex flex-wrap gap-2">
              <Chip label="Any" selected={ageMin === '' && ageMax === ''} onClick={() => filterByAge('', '')} />
              <Chip label="21 - 25" selected={ageMin === 21 && ageMax === 25} onClick={() => filterByAge(21, 25)} />
              <Chip label="26 - 30" selected={ageMin === 26 && ageMax === 30} onClick={() => filterByAge(26, 30)} />
              <Chip label="31 - 35" selected={ageMin === 31 && ageMax === 35} onClick={() => filterByAge(31, 35)} />
              <Chip label="36+" selected={ageMin === 36 && ageMax === ''} onClick={() => filterByAge(36, '')} />
            </div>
          </div>
          
          <div className="h-[1px] bg-border w-full" />

          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <span className="text-sm font-medium text-muted w-24 shrink-0">Cities</span>
            <div className="flex flex-wrap gap-2 flex-1 items-center">
              {['Mumbai', 'Pune', 'Surat', 'Dubai'].map(c => (
                <Chip key={c} label={c} selected={cityFilter === c} onClick={() => filterByCity(c)} />
              ))}
              <input 
                type="text" 
                placeholder="Other city..." 
                value={cityFilter && !['Mumbai', 'Pune', 'Surat', 'Dubai'].includes(cityFilter) ? cityFilter : ''} 
                onChange={(e) => filterByCity(e.target.value)} 
                className="px-4 py-2 rounded-full border border-border focus:outline-none focus:border-primary transition-all bg-background text-sm w-32 ml-2" 
              />
            </div>
          </div>
        </div>

        {candidates.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-8 mb-16">
            {candidates.map((candidate) => (
              <div key={candidate.profileId} className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm flex flex-col group">
                
                {/* Photo Header (Forced Blurred for Teaser) */}
                <div className="relative h-48 sm:h-56 bg-muted/20 overflow-hidden flex items-center justify-center">
                  {/* Fake a heavily blurred background image representing the photo */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/40 to-accent/20 blur-xl scale-125" />
                  <div className="absolute inset-0 backdrop-blur-3xl bg-background/30" />
                  
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-background/50 backdrop-blur-md rounded-full flex items-center justify-center border border-surface/50 shadow-sm text-foreground">
                      <Lock className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-foreground bg-background/50 backdrop-blur-md px-3 py-1 rounded-full">
                      Protected Photo
                    </span>
                  </div>
                </div>

                {/* Explicit Unlock Copy */}
                <div className="bg-accent-light/30 border-y border-border px-4 py-2 text-[11px] font-medium text-primary text-center uppercase tracking-wide">
                  Unlock photos in the app
                </div>

                {/* Profile Details */}
                <div className="p-8 pt-10 flex-1 flex flex-col relative">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Obscured Alias */}
                        <div className="relative overflow-hidden inline-flex items-center bg-muted/20 rounded px-2 py-0.5">
                          <span className="text-xl font-bold text-foreground/40 select-none blur-[6px] relative z-0 truncate tracking-widest leading-none">
                            ••••••••
                          </span>
                          <div className="absolute inset-0 flex items-center justify-center z-10">
                            <Lock className="w-4 h-4 text-foreground/60" />
                          </div>
                        </div>
                        <span className="text-xl font-bold text-foreground">
                          , {candidate.age}
                        </span>
                      </div>
                      <p className="text-sm text-primary font-medium mt-1 uppercase tracking-wider text-[10px]">Unlock in app</p>
                      <p className="text-sm text-muted mt-2 line-clamp-1">{candidate.profession}</p>
                    </div>
                    <div className="bg-background border border-border px-2 py-1.5 rounded-lg shrink-0 text-center shadow-sm">
                      <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-0.5">Match</p>
                      <p className="text-base font-bold text-primary leading-none">{candidate.matchPercentage}%</p>
                    </div>
                  </div>

                  <div className="space-y-2 mt-auto">
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      <span className="truncate">{candidate.city}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>
                      <span className="truncate">{candidate.education}</span>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-surface rounded-3xl border border-border mb-16">
            <h3 className="text-xl font-bold mb-2">Finding your matches...</h3>
            <p className="text-muted">We are carefully curating the best matches for you. Open the app to set your preferences.</p>
          </div>
        )}

        <div className="bg-primary text-surface p-10 rounded-3xl text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-black/5 -z-10" />
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Continue in the app for the full experience</h2>
          <p className="text-accent-light/90 max-w-lg mx-auto mb-8">
            View full profiles, request to unlock photos safely, and match securely with members of the community.
          </p>
          <StoreBadges />
        </div>

      </div>
    </div>
  );
}

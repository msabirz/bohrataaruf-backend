'use client';

import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, GraduationCap, Briefcase, MapPin, Heart, Home, Users, Baby, Sparkles, Lock } from 'lucide-react';
import { LifestyleBadges } from '@/components/app/LifestyleBadges';
import type { TraitPair } from '@/components/app/LifestyleToggle';

type RichProfile = {
  profileId: string;
  alias: string;
  bio: string | null;
  introLine: string | null;
  age: number;
  city: string;
  jamaat: string | null;
  education: string | null;
  fieldOfStudy: string | null;
  profession: string | null;
  maritalStatus: string | null;
  willingToRelocate: string | null;
  brothersCount: number | null;
  sistersCount: number | null;
  hasChildren: boolean | null;
  childrenCount: number | null;
  childrenLivingStatus: string | null;
  photoUri: string | null;
  viewsRemaining: number;
  photoPrivacyMode: 'always' | 'three_then_request' | 'request_only' | 'blur_until_match';
  photoRequestStatus: 'not_applicable' | 'none' | 'pending' | 'approved' | 'denied';
  photoGrantedUntil: string | null;
  matchPercentage: number | null;
  preferences: { practiceLevel: string | null; familyExpectation: string | null } | null;
  lifestyleAnswers?: Record<string, string> | null;
};

function labelize(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function ProfileDetailModal({
  profileId,
  onClose,
  onInterested,
  onSkip,
  variant = 'discover',
  onWithdraw,
}: {
  profileId: string;
  onClose: () => void;
  onInterested: (id: string) => void;
  onSkip: (id: string) => void;
  // Available actions differ by where the modal was opened from — Discover
  // offers Interested/Skip, Received offers Interested/Decline (reusing the
  // same two callbacks, different labels), Sent only offers Withdraw (no
  // Interested/Skip action makes sense for someone you've already sent
  // interest to).
  variant?: 'discover' | 'received' | 'sent';
  onWithdraw?: (id: string) => void;
}) {
  const [profile, setProfile] = useState<RichProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // The real photo URL only ever lands here as a direct result of a successful
  // POST /matching/photo-view call — it's never present in the profile data itself.
  const [revealedPhotoUri, setRevealedPhotoUri] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [traitPairs, setTraitPairs] = useState<TraitPair[]>([]);
  // Set when the backend rejects the fetch with NOT_VERIFIED (real
  // enforcement boundary on /matching/profile/[id]) — the raw error object
  // was previously being set as `profile` itself (no res.ok check), which
  // rendered a broken-looking, mostly-blank modal instead of an explanation.
  const [notVerifiedStatus, setNotVerifiedStatus] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/v1/matching/profile/${profileId}`)
      .then(async (r) => {
        const d = await r.json();
        if (!isMounted) return;
        if (!r.ok) {
          if (d.error === 'NOT_VERIFIED') setNotVerifiedStatus(d.code || 'unsubmitted');
          return;
        }
        setProfile(d);
      })
      .finally(() => { if (isMounted) setIsLoading(false); });
    return () => { isMounted = false; };
  }, [profileId]);

  useEffect(() => {
    fetch('/api/v1/lifestyle-traits').then(r => r.json()).then(d => setTraitPairs(d.pairs || [])).catch(() => {});
  }, []);

  const revealPhoto = async () => {
    if (!profile || profile.viewsRemaining <= 0 || isRevealing) return;
    setIsRevealing(true);
    try {
      const res = await fetch('/api/v1/matching/photo-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.profileId }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(prev => prev ? { ...prev, viewsRemaining: data.viewsRemaining } : prev);
        if (data.photoUri) setRevealedPhotoUri(data.photoUri);
      }
    } finally {
      setIsRevealing(false);
    }
  };

  const requestPhoto = async () => {
    if (!profile || isRequesting) return;
    setIsRequesting(true);
    try {
      const res = await fetch('/api/v1/matching/photo-view-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.profileId }),
      });
      if (res.ok) {
        setProfile(prev => prev ? { ...prev, photoRequestStatus: 'pending' } : prev);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-surface/90 border border-border flex items-center justify-center text-foreground hover:bg-background transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {isLoading ? (
          <div className="w-full h-96 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : notVerifiedStatus ? (
          <div className="w-full h-96 flex flex-col items-center justify-center gap-3 px-8 text-center">
            <ShieldCheck className="w-10 h-10 text-muted" />
            <h3 className="text-lg font-bold text-foreground">Verification required</h3>
            <p className="text-sm text-muted max-w-xs">
              {notVerifiedStatus === 'pending'
                ? 'Your verification is pending volunteer review. You can view profiles once verified.'
                : 'Complete ITS verification to view profiles.'}
            </p>
            {notVerifiedStatus !== 'pending' && (
              <a href="/verification" className="bg-primary text-surface font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors">
                Verify now
              </a>
            )}
          </div>
        ) : !profile ? (
          <div className="w-full h-96 flex items-center justify-center">
            <p className="text-sm text-muted">Profile not found.</p>
          </div>
        ) : (
          <>
            {/* Photo panel — fixed height, does not scroll */}
            <div className="relative w-full md:w-[38%] h-64 md:h-auto shrink-0 overflow-hidden">
              {revealedPhotoUri || profile.photoUri ? (
                <img
                  src={revealedPhotoUri || profile.photoUri!}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-accent-light to-accent/30 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-primary/50" />
                </div>
              )}
              {!revealedPhotoUri && profile.photoPrivacyMode === 'three_then_request' && profile.viewsRemaining > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-foreground/10">
                  <button
                    onClick={revealPhoto}
                    disabled={isRevealing}
                    className="bg-surface/90 backdrop-blur px-5 py-2.5 rounded-full text-sm font-semibold text-foreground shadow-sm disabled:opacity-50"
                  >
                    {isRevealing ? 'Revealing...' : `Tap to view photo (${profile.viewsRemaining} left)`}
                  </button>
                </div>
              )}
              {!revealedPhotoUri
                && (profile.photoPrivacyMode === 'request_only' || (profile.photoPrivacyMode === 'three_then_request' && profile.viewsRemaining === 0))
                && (profile.photoRequestStatus === 'none' || profile.photoRequestStatus === 'denied') && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-foreground/10">
                  <button
                    onClick={requestPhoto}
                    disabled={isRequesting}
                    className="bg-surface/90 backdrop-blur px-5 py-2.5 rounded-full text-sm font-semibold text-foreground shadow-sm disabled:opacity-50"
                  >
                    {isRequesting ? 'Sending...' : 'Request a view'}
                  </button>
                </div>
              )}
              {profile.photoPrivacyMode !== 'always' && (
                <div className="absolute bottom-0 inset-x-0 bg-foreground/60 backdrop-blur-sm text-surface text-xs px-4 py-2.5 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {revealedPhotoUri
                      ? 'Photo unlocked for this view'
                      : profile.photoRequestStatus === 'approved'
                      ? profile.photoGrantedUntil
                        ? `You can view this photo until ${new Date(profile.photoGrantedUntil).toLocaleString()}`
                        : 'You have permanent access to this photo'
                      : profile.photoRequestStatus === 'pending'
                      ? 'Photo request sent — awaiting response'
                      : profile.photoPrivacyMode === 'blur_until_match'
                      ? 'Photo unlocks after a mutual match'
                      : profile.photoPrivacyMode === 'three_then_request' && profile.viewsRemaining > 0
                      ? `Photo visible only after mutual interest · ${profile.viewsRemaining} views left`
                      : 'Photo only visible by request'}
                  </span>
                </div>
              )}
              {profile.matchPercentage !== null && (
                <div className="absolute top-4 left-4 bg-surface/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold text-primary shadow-sm">
                  {profile.matchPercentage}% Compatible
                </div>
              )}
            </div>

            {/* Info panel — this is the part that scrolls */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-foreground">{profile.alias}</h2>
                <ShieldCheck className="w-5 h-5 text-accent" />
              </div>
              <p className="text-muted text-sm mb-6">{profile.age} Years &middot; {profile.city}</p>

              {profile.bio && (
                <div className="mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-muted mb-2">About</h3>
                  <p className="text-sm text-foreground leading-relaxed">{profile.bio}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                {profile.education && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                    <span>{profile.education}{profile.fieldOfStudy ? ` · ${profile.fieldOfStudy}` : ''}</span>
                  </div>
                )}
                {profile.profession && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Briefcase className="w-4 h-4 text-primary shrink-0" />
                    <span>{profile.profession}</span>
                  </div>
                )}
                {profile.city && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <span>{profile.city}</span>
                  </div>
                )}
                {profile.jamaat && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Home className="w-4 h-4 text-primary shrink-0" />
                    <span>{profile.jamaat} Jamaat</span>
                  </div>
                )}
                {profile.preferences?.practiceLevel && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                    <span>{labelize(profile.preferences.practiceLevel)}</span>
                  </div>
                )}
                {profile.preferences?.familyExpectation && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Heart className="w-4 h-4 text-primary shrink-0" />
                    <span>Family: {labelize(profile.preferences.familyExpectation)}</span>
                  </div>
                )}
                {profile.maritalStatus && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Users className="w-4 h-4 text-primary shrink-0" />
                    <span>{labelize(profile.maritalStatus)}</span>
                  </div>
                )}
                {profile.hasChildren && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Baby className="w-4 h-4 text-primary shrink-0" />
                    <span>{profile.childrenCount} {profile.childrenCount === 1 ? 'child' : 'children'}{profile.childrenLivingStatus ? ` · ${labelize(profile.childrenLivingStatus)}` : ''}</span>
                  </div>
                )}
              </div>

              {profile.lifestyleAnswers && Object.keys(profile.lifestyleAnswers).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-muted mb-2">Lifestyle & Personality</h3>
                  <LifestyleBadges answers={profile.lifestyleAnswers} traitPairs={traitPairs} />
                </div>
              )}

              {variant === 'sent' ? (
                <div className="pt-4 border-t border-border">
                  <button
                    onClick={() => onWithdraw?.(profile.profileId)}
                    className="w-full border border-border text-muted font-medium py-3 rounded-xl hover:bg-background transition-colors"
                  >
                    Withdraw Interest
                  </button>
                </div>
              ) : (
                <div className="flex gap-3 pt-4 border-t border-border">
                  <button
                    onClick={() => onInterested(profile.profileId)}
                    className="flex-1 bg-primary text-surface font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <Heart className="w-4 h-4" /> I&apos;m Interested
                  </button>
                  <button
                    onClick={() => onSkip(profile.profileId)}
                    className="flex-1 border border-border text-foreground font-medium py-3 rounded-xl hover:bg-background transition-colors"
                  >
                    {variant === 'received' ? 'Decline' : 'Skip Profile'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

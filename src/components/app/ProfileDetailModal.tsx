'use client';

import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, GraduationCap, Briefcase, MapPin, Heart, Home, Users, Baby, Sparkles, Lock } from 'lucide-react';

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
  matchPercentage: number | null;
  preferences: { practiceLevel: string | null; familyExpectation: string | null } | null;
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
}: {
  profileId: string;
  onClose: () => void;
  onInterested: (id: string) => void;
  onSkip: (id: string) => void;
}) {
  const [profile, setProfile] = useState<RichProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // The real photo URL only ever lands here as a direct result of a successful
  // POST /matching/photo-view call — it's never present in the profile data itself.
  const [revealedPhotoUri, setRevealedPhotoUri] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/v1/matching/profile/${profileId}`)
      .then(r => r.json())
      .then(d => { if (isMounted) setProfile(d); })
      .finally(() => { if (isMounted) setIsLoading(false); });
    return () => { isMounted = false; };
  }, [profileId]);

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

        {isLoading || !profile ? (
          <div className="w-full h-96 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Photo panel — fixed height, does not scroll */}
            <div className="relative w-full md:w-[38%] h-64 md:h-auto shrink-0 overflow-hidden">
              {revealedPhotoUri ? (
                <img
                  src={revealedPhotoUri}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-accent-light to-accent/30 flex flex-col items-center justify-center gap-3">
                  <Lock className="w-8 h-8 text-primary/50" />
                  <button
                    onClick={revealPhoto}
                    disabled={profile.viewsRemaining <= 0 || isRevealing}
                    className="bg-surface/90 backdrop-blur px-5 py-2.5 rounded-full text-sm font-semibold text-foreground shadow-sm disabled:opacity-50"
                  >
                    {isRevealing ? 'Revealing...' : profile.viewsRemaining > 0 ? `Tap to view photo (${profile.viewsRemaining} left)` : 'No views left'}
                  </button>
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
                  Skip Profile
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, ChevronDown, Lock, X as XIcon, Heart, GraduationCap, MapPin } from 'lucide-react';
import { ProfileDetailModal } from '@/components/app/ProfileDetailModal';

type Candidate = {
  profileId: string;
  alias: string;
  age: number;
  city: string;
  education: string | null;
  profession: string | null;
  bio: string | null;
  introLine: string | null;
  photoUri: string | null;
  viewsRemaining: number;
  matchPercentage: number | null;
};

export default function DiscoverPage() {
  const router = useRouter();
  const [queue, setQueue] = useState<Candidate[]>([]);
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdvancing, setIsAdvancing] = useState(false);
  // The real photo URL only ever lands here as a direct result of a successful
  // POST /matching/photo-view call — it's never present in the candidate data itself.
  const [revealedPhotoUri, setRevealedPhotoUri] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [modalProfileId, setModalProfileId] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);

  const fetchBatch = useCallback(async (excludeIds: string[]): Promise<Candidate[]> => {
    const res = await fetch('/api/v1/matching/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 10, excludeIds }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.candidates || [];
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const candidates = await fetchBatch([]);
      if (!mounted) return;
      setQueue(candidates);
      setExhausted(candidates.length === 0);
      setIsLoading(false);
    })();
    return () => { mounted = false; };
  }, [fetchBatch]);

  const current = queue[index];

  const advance = useCallback(async () => {
    setRevealedPhotoUri(null);
    const nextIndex = index + 1;
    if (nextIndex < queue.length) {
      setIndex(nextIndex);
      return;
    }
    setIsAdvancing(true);
    const excludeIds = queue.map(c => c.profileId);
    const more = await fetchBatch(excludeIds);
    setIsAdvancing(false);
    if (more.length === 0) {
      setExhausted(true);
      return;
    }
    setQueue(prev => [...prev, ...more]);
    setIndex(nextIndex);
  }, [index, queue, fetchBatch]);

  const act = async (action: 'interested' | 'skip', profileId: string) => {
    setModalProfileId(null);
    try {
      const res = await fetch(`/api/v1/interactions/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });
      if (action === 'interested' && res.ok) {
        const data = await res.json();
        if (data.mutualMatch) {
          // The interested endpoint confirms a match but doesn't return its id —
          // look it up from the matches list so we can jump straight to the reveal.
          const matchesRes = await fetch('/api/v1/matches');
          const matchesData = await matchesRes.json();
          const justMatched = (matchesData.matches || []).find((m: any) => m.profileId === profileId);
          if (justMatched) {
            router.push(`/matches/${justMatched.matchId}`);
            return;
          }
        }
      }
    } catch {}
    advance();
  };

  const revealPhoto = async () => {
    if (!current || current.viewsRemaining <= 0 || isRevealing) return;
    setIsRevealing(true);
    try {
      const res = await fetch('/api/v1/matching/photo-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: current.profileId }),
      });
      if (res.ok) {
        const data = await res.json();
        setQueue(prev => prev.map((c, i) => i === index ? { ...c, viewsRemaining: data.viewsRemaining } : c));
        if (data.photoUri) setRevealedPhotoUri(data.photoUri);
      }
    } finally {
      setIsRevealing(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-background px-6 pt-8 pb-24">
      <div className="container mx-auto max-w-3xl">
        {/* Filters / sort — visual shell only for this pass */}
        <div className="flex items-center justify-between mb-8">
          <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-surface text-sm font-medium text-foreground hover:bg-background transition-colors">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-surface text-sm font-medium text-foreground">
            <span className="text-muted">Sort by:</span>
            Compatibility
            <ChevronDown className="w-4 h-4 text-muted" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : exhausted || !current ? (
          <div className="text-center py-24 bg-surface rounded-3xl border border-border">
            <h3 className="text-xl font-bold mb-2 text-foreground">You&apos;re all caught up</h3>
            <p className="text-muted">Check back later for new profiles, or adjust your preferences to see more matches.</p>
          </div>
        ) : (
          <>
            {/* Card stack */}
            <div className="relative">
              <div className="absolute inset-0 bg-surface border border-border rounded-3xl rotate-2 translate-x-2" aria-hidden />
              <div className="absolute inset-0 bg-surface border border-border rounded-3xl -rotate-2 -translate-x-2" aria-hidden />

              <div className="relative bg-surface border border-border rounded-3xl shadow-sm overflow-hidden">
                <button
                  onClick={() => act('skip', current.profileId)}
                  className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-surface/90 border border-border flex items-center justify-center text-muted hover:text-foreground transition-colors"
                  aria-label="Dismiss"
                >
                  <XIcon className="w-4 h-4" />
                </button>

                <div className="flex flex-col md:flex-row">
                  {/* Photo panel ~38% */}
                  <div className="relative w-full md:w-[38%] h-72 md:h-auto shrink-0 overflow-hidden">
                    {revealedPhotoUri ? (
                      <img
                        src={revealedPhotoUri}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent-light to-accent/30 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-primary/50" />
                      </div>
                    )}
                    {current.matchPercentage !== null && (
                      <div className="absolute top-4 left-4 bg-surface/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold text-primary shadow-sm">
                        {current.matchPercentage}% Compatible
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-foreground/60 backdrop-blur-sm text-surface text-xs px-4 py-2.5 flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {revealedPhotoUri
                          ? 'Photo unlocked for this view'
                          : `Photo visible only after mutual interest · ${current.viewsRemaining} views left`}
                      </span>
                    </div>
                    {!revealedPhotoUri && current.viewsRemaining > 0 && (
                      <button
                        onClick={revealPhoto}
                        disabled={isRevealing}
                        className="absolute inset-0 flex items-center justify-center"
                        aria-label="Tap to view photo"
                      >
                        <span className="bg-surface/90 backdrop-blur px-4 py-2 rounded-full text-xs font-semibold text-foreground shadow-sm">
                          {isRevealing ? 'Revealing...' : 'Tap to view'}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Info panel ~62% */}
                  <div className="flex-1 p-6 md:p-8 flex flex-col">
                    <button
                      onClick={() => setModalProfileId(current.profileId)}
                      className="text-left text-2xl font-bold text-foreground hover:text-primary transition-colors mb-1"
                    >
                      {current.alias}
                    </button>
                    <p className="text-sm text-muted mb-4">{current.age} Years &middot; {current.city}</p>

                    <div className="space-y-1.5 mb-4 text-sm text-foreground">
                      {current.education && (
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                          <span>{current.education}</span>
                        </div>
                      )}
                      {current.profession && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary shrink-0" />
                          <span>{current.profession}</span>
                        </div>
                      )}
                    </div>

                    {current.bio && (
                      <p className="text-sm text-muted leading-relaxed mb-4 line-clamp-3">{current.bio}</p>
                    )}

                    {current.education && (
                      <div className="flex flex-wrap gap-2 mb-6">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-light/40 border border-accent/20 text-xs font-medium text-primary">
                          <GraduationCap className="w-3.5 h-3.5" />
                          {current.education}
                        </span>
                      </div>
                    )}

                    <div className="mt-auto flex gap-3">
                      <button
                        onClick={() => act('interested', current.profileId)}
                        className="flex-1 bg-primary text-surface font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                      >
                        <Heart className="w-4 h-4" /> I&apos;m Interested
                      </button>
                      <button
                        onClick={() => act('skip', current.profileId)}
                        className="flex-1 border border-border text-foreground font-medium py-3 rounded-xl hover:bg-background transition-colors"
                      >
                        Skip Profile
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {isAdvancing && (
              <div className="text-center text-sm text-muted mt-4">Finding your next match...</div>
            )}

            <p className="text-center text-xs text-muted mt-8">
              We value your privacy. No photos or contact details are shared without mutual interest.
            </p>
          </>
        )}
      </div>

      {modalProfileId && (
        <ProfileDetailModal
          profileId={modalProfileId}
          onClose={() => setModalProfileId(null)}
          onInterested={(id) => act('interested', id)}
          onSkip={(id) => act('skip', id)}
        />
      )}
    </div>
  );
}

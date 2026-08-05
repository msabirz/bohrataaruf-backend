'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, ChevronDown, Lock, X as XIcon, Heart, GraduationCap, MapPin } from 'lucide-react';
import { ProfileDetailModal } from '@/components/app/ProfileDetailModal';
import { FilterPanel, DEFAULT_FILTERS, buildFilterPayload, RADIUS_MIN, RADIUS_MAX, type FilterState } from '@/components/app/FilterPanel';
import { LifestyleBadges } from '@/components/app/LifestyleBadges';
import type { TraitPair } from '@/components/app/LifestyleToggle';
import { WebRangeSlider } from '@/components/app/WebRangeSlider';

const NEARBY_DEFAULT_RADIUS_KM = 25;

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
  photoPrivacyMode: 'always' | 'three_then_request' | 'request_only' | 'blur_until_match';
  photoRequestStatus: 'not_applicable' | 'none' | 'pending' | 'approved' | 'denied';
  photoGrantedUntil: string | null;
  matchPercentage: number | null;
  lifestyleAnswers?: Record<string, string> | null;
  viewerIsVerified?: boolean;
  viewerVerificationStatus?: string;
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
  const [isRequesting, setIsRequesting] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [traitPairs, setTraitPairs] = useState<TraitPair[]>([]);
  const [feedMode, setFeedMode] = useState<'forYou' | 'nearby'>('forYou');
  // Defaults true so the toggle doesn't flash a disabled radius slider
  // before the first check lands — same convention as FilterPanel's own
  // radius slider and mobile's Nearby toggle.
  const [viewerHasLocation, setViewerHasLocation] = useState(true);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);

  useEffect(() => {
    fetch('/api/v1/lifestyle-traits').then(r => r.json()).then(d => setTraitPairs(d.pairs || [])).catch(() => {});
    fetch('/api/v1/profile').then(r => r.json()).then(d => setViewerHasLocation(d.latitude != null && d.longitude != null)).catch(() => {});
  }, []);

  const handleFeedModeChange = (mode: 'forYou' | 'nearby') => {
    setFeedMode(mode);
    setFilters(f => ({ ...f, radiusKm: mode === 'nearby' ? NEARBY_DEFAULT_RADIUS_KM : RADIUS_MAX }));
  };

  const requestLocationForNearby = () => {
    if (isRequestingLocation || !navigator.geolocation) return;
    setIsRequestingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await fetch('/api/v1/profile/basics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
          });
          setViewerHasLocation(true);
        } finally {
          setIsRequestingLocation(false);
        }
      },
      () => {
        setIsRequestingLocation(false);
        alert('Location access was denied. Enable it in your browser settings to see nearby profiles.');
      },
      { timeout: 8000 }
    );
  };

  const fetchBatch = useCallback(async (excludeIds: string[]): Promise<Candidate[]> => {
    const res = await fetch('/api/v1/matching/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 10, excludeIds, filters: buildFilterPayload(filters) }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.candidates || [];
  }, [filters]);

  // Re-fires whenever `filters` changes (fetchBatch's identity depends on
  // it) — resets the queue from scratch, exactly the "Apply Filters"
  // behavior we want, not just the initial mount fetch.
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setIndex(0);
    setRevealedPhotoUri(null);
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

  const activeFilterCount = [
    filters.ageRange[0] > DEFAULT_FILTERS.ageRange[0] || filters.ageRange[1] < DEFAULT_FILTERS.ageRange[1],
    filters.heightRange[0] > DEFAULT_FILTERS.heightRange[0] || filters.heightRange[1] < DEFAULT_FILTERS.heightRange[1],
    filters.radiusKm < DEFAULT_FILTERS.radiusKm,
    filters.cities.length > 0,
    filters.education.length > 0,
    filters.professions.length > 0,
    !!filters.practiceLevel,
  ].filter(Boolean).length;

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

  const requestPhoto = async () => {
    if (!current || isRequesting) return;
    setIsRequesting(true);
    try {
      const res = await fetch('/api/v1/matching/photo-view-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: current.profileId }),
      });
      if (res.ok) {
        setQueue(prev => prev.map((c, i) => i === index ? { ...c, photoRequestStatus: 'pending' } : c));
      }
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-background px-6 pt-8 pb-24">
      <div className="container mx-auto max-w-3xl">
        {/* For You / Nearby toggle */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleFeedModeChange('forYou')}
              className={`text-sm transition-colors ${feedMode === 'forYou' ? 'bg-primary text-surface font-bold px-5 py-2 rounded-full' : 'text-muted hover:text-foreground font-semibold px-1 py-2'}`}
            >
              For you
            </button>
            <button
              onClick={() => handleFeedModeChange('nearby')}
              className={`text-sm transition-colors ${feedMode === 'nearby' ? 'bg-primary text-surface font-bold px-5 py-2 rounded-full' : 'text-muted hover:text-foreground font-semibold px-1 py-2'}`}
            >
              Nearby
            </button>
          </div>
          {feedMode === 'nearby' && (
            <div className="mt-4 max-w-xs">
              <WebRangeSlider
                label="Within Distance"
                min={RADIUS_MIN}
                max={RADIUS_MAX}
                values={[filters.radiusKm]}
                onChange={(v) => setFilters(f => ({ ...f, radiusKm: v[0] }))}
                unit=" km"
                disabled={!viewerHasLocation}
                onDisabledClick={requestLocationForNearby}
              />
              {!viewerHasLocation && (
                <p className="text-xs text-muted mt-2">
                  {isRequestingLocation ? 'Requesting location access…' : 'Click the slider to enable — Nearby needs your location.'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Filters / sort */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => setFilterPanelOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-surface text-sm font-medium text-foreground hover:bg-background transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-[18px] h-[18px] rounded-full bg-primary text-surface text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
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
                    {/* The backend always resolves an actual (blurred-derivative or real)
                        photo URL per the owner's mode — never a placeholder, unless the
                        profile genuinely has no photo uploaded at all. */}
                    {revealedPhotoUri || current.photoUri ? (
                      <img
                        src={revealedPhotoUri || current.photoUri!}
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
                    {current.photoPrivacyMode !== 'always' && (
                      <div className="absolute bottom-0 inset-x-0 bg-foreground/60 backdrop-blur-sm text-surface text-xs px-4 py-2.5 flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {revealedPhotoUri
                            ? 'Photo unlocked for this view'
                            : current.photoRequestStatus === 'approved'
                            ? current.photoGrantedUntil
                              ? `You can view this photo until ${new Date(current.photoGrantedUntil).toLocaleString()}`
                              : 'You have permanent access to this photo'
                            : current.photoRequestStatus === 'pending'
                            ? 'Photo request sent — awaiting response'
                            : current.photoPrivacyMode === 'blur_until_match'
                            ? 'Photo unlocks after a mutual match'
                            : current.photoPrivacyMode === 'three_then_request' && current.viewsRemaining > 0
                            ? `Photo visible only after mutual interest · ${current.viewsRemaining} views left`
                            : 'Photo only visible by request'}
                        </span>
                      </div>
                    )}
                    {!revealedPhotoUri && current.photoPrivacyMode === 'three_then_request' && current.viewsRemaining > 0 && (
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
                    {(current.photoPrivacyMode === 'request_only' || (current.photoPrivacyMode === 'three_then_request' && current.viewsRemaining === 0))
                      && (current.photoRequestStatus === 'none' || current.photoRequestStatus === 'denied') && (
                      <button
                        onClick={requestPhoto}
                        disabled={isRequesting}
                        className="absolute inset-0 flex items-center justify-center"
                        aria-label="Request to view photo"
                      >
                        <span className="bg-surface/90 backdrop-blur px-4 py-2 rounded-full text-xs font-semibold text-foreground shadow-sm">
                          {isRequesting ? 'Sending...' : 'Request a view'}
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
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-light/40 border border-accent/20 text-xs font-medium text-primary">
                          <GraduationCap className="w-3.5 h-3.5" />
                          {current.education}
                        </span>
                      </div>
                    )}

                    <div className="mb-6">
                      <LifestyleBadges answers={current.lifestyleAnswers} traitPairs={traitPairs} />
                    </div>

                    {current.viewerIsVerified === false ? (
                      // Real enforcement for viewing full profile detail lives
                      // server-side (NOT_VERIFIED on /matching/profile/[id]);
                      // this inline block matches mobile's card-level treatment
                      // so an unverified viewer sees an explanation up front
                      // instead of a silently-swallowed failed action.
                      <div className="mt-auto space-y-2">
                        <div className="bg-accent-light/40 border border-accent/20 rounded-xl px-4 py-3 text-center space-y-2">
                          <p className="text-xs font-medium text-muted">
                            {current.viewerVerificationStatus === 'pending'
                              ? 'Your verification is pending volunteer review.'
                              : 'Complete ITS verification to express interest.'}
                          </p>
                          {current.viewerVerificationStatus !== 'pending' && (
                            <a href="/verification" className="inline-block text-xs font-bold text-primary hover:underline">
                              Verify now
                            </a>
                          )}
                        </div>
                        <button
                          onClick={() => act('skip', current.profileId)}
                          className="w-full border border-border text-foreground font-medium py-3 rounded-xl hover:bg-background transition-colors"
                        >
                          Skip Profile
                        </button>
                      </div>
                    ) : (
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
                    )}
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

      <FilterPanel
        visible={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        onApply={(newFilters) => setFilters(newFilters)}
        initialFilters={filters}
      />
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, X as XIcon, Briefcase, Lock } from 'lucide-react';
import { ProfileDetailModal } from '@/components/app/ProfileDetailModal';

type MiniProfile = {
  profileId: string;
  alias: string;
  age: number;
  city: string;
  profession: string | null;
  photoUri: string | null;
  bio: string | null;
  introLine: string | null;
  matchPercentage?: number;
  interestedAt?: string;
};

type MatchItem = {
  matchId: string;
  profileId: string;
  alias: string;
  realPhotoUri: string | null;
  age: number;
  city: string;
  matchPercentage?: number;
  handoffStatus: string;
};

type TabKey = 'received' | 'sent' | 'matched';

export default function InterestsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('received');
  const [received, setReceived] = useState<MiniProfile[] | null>(null);
  const [sent, setSent] = useState<MiniProfile[] | null>(null);
  const [matched, setMatched] = useState<MatchItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modalProfileId, setModalProfileId] = useState<string | null>(null);

  const loadReceived = useCallback(async () => {
    const res = await fetch('/api/v1/interactions/received');
    const data = await res.json();
    setReceived(data.profilesList || []);
  }, []);

  const loadSent = useCallback(async () => {
    const res = await fetch('/api/v1/interactions/sent');
    const data = await res.json();
    setSent(data.profilesList || []);
  }, []);

  const loadMatched = useCallback(async () => {
    const res = await fetch('/api/v1/matches');
    const data = await res.json();
    setMatched(data.matches || []);
  }, []);

  useEffect(() => {
    loadReceived();
    loadSent();
    loadMatched();
  }, [loadReceived, loadSent, loadMatched]);

  const respondToReceived = async (profileId: string, action: 'interested' | 'decline') => {
    setBusyId(profileId);
    try {
      const endpoint = action === 'interested' ? '/api/v1/interactions/interested' : '/api/v1/interactions/decline';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });
      if (action === 'interested' && res.ok) {
        const data = await res.json();
        if (data.mutualMatch) {
          const matchesRes = await fetch('/api/v1/matches');
          const matchesData = await matchesRes.json();
          const justMatched = (matchesData.matches || []).find((m: any) => m.profileId === profileId);
          if (justMatched) {
            router.push(`/matches/${justMatched.matchId}`);
            return;
          }
        }
      }
      await Promise.all([loadReceived(), loadMatched()]);
    } finally {
      setBusyId(null);
    }
  };

  const withdrawSent = async (profileId: string) => {
    setBusyId(profileId);
    try {
      await fetch('/api/v1/interactions/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });
      await loadSent();
    } finally {
      setBusyId(null);
    }
  };

  const tabs: { key: TabKey; label: string; count: number | null }[] = [
    { key: 'received', label: 'Received', count: received?.length ?? null },
    { key: 'sent', label: 'Sent', count: sent?.length ?? null },
    { key: 'matched', label: 'Matched', count: matched?.length ?? null },
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] bg-background px-6 pt-8 pb-24">
      <div className="container mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-foreground mb-6">Interests</h1>

        <div className="flex items-center gap-2 border-b border-border mb-8">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-[1px] transition-colors ${
                activeTab === tab.key ? 'border-primary text-foreground' : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              {tab.label}{tab.count !== null ? ` (${tab.count})` : ''}
            </button>
          ))}
        </div>

        {activeTab === 'received' && (
          received === null ? (
            <LoadingGrid />
          ) : received.length === 0 ? (
            <EmptyState message="No one has expressed interest yet. Keep browsing Discover!" />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
              {received.map(p => (
                <MiniCard key={p.profileId} profile={p} onClickName={() => setModalProfileId(p.profileId)}>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => respondToReceived(p.profileId, 'interested')}
                      disabled={busyId === p.profileId}
                      className="flex-1 bg-primary text-surface text-xs font-bold py-2 rounded-lg disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <Heart className="w-3.5 h-3.5" /> Interested
                    </button>
                    <button
                      onClick={() => respondToReceived(p.profileId, 'decline')}
                      disabled={busyId === p.profileId}
                      className="px-3 border border-border text-muted rounded-lg disabled:opacity-50"
                      aria-label="Decline"
                    >
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </MiniCard>
              ))}
            </div>
          )
        )}

        {activeTab === 'sent' && (
          sent === null ? (
            <LoadingGrid />
          ) : sent.length === 0 ? (
            <EmptyState message="You haven't expressed interest in anyone yet." />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
              {sent.map(p => (
                <MiniCard key={p.profileId} profile={p} onClickName={() => setModalProfileId(p.profileId)}>
                  <button
                    onClick={() => withdrawSent(p.profileId)}
                    disabled={busyId === p.profileId}
                    className="w-full mt-3 border border-border text-muted text-xs font-medium py-2 rounded-lg hover:bg-background transition-colors disabled:opacity-50"
                  >
                    Withdraw
                  </button>
                </MiniCard>
              ))}
            </div>
          )
        )}

        {activeTab === 'matched' && (
          matched === null ? (
            <LoadingGrid />
          ) : matched.length === 0 ? (
            <EmptyState message="No mutual matches yet — when you and someone else both say yes, they'll show up here." />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
              {matched.map(m => (
                <Link
                  key={m.matchId}
                  href={`/matches/${m.matchId}`}
                  className="bg-surface border border-border rounded-2xl overflow-hidden hover:shadow-sm transition-shadow"
                >
                  <div className="relative h-40 bg-muted/10">
                    {m.realPhotoUri && <img src={m.realPhotoUri} alt="" className="w-full h-full object-cover" />}
                    {m.matchPercentage !== undefined && (
                      <div className="absolute top-2 left-2 bg-surface/90 backdrop-blur px-2.5 py-1 rounded-full text-[10px] font-bold text-primary">
                        {m.matchPercentage}% match
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-foreground truncate">{m.alias}, {m.age}</p>
                    <p className="text-xs text-muted truncate">{m.city}</p>
                    {m.handoffStatus !== 'complete' && (
                      <p className="text-[11px] text-accent mt-1 font-medium">
                        {m.handoffStatus === 'action_required' ? 'Share your details to connect' : 'Waiting on them'}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </div>

      {modalProfileId && (
        <ProfileDetailModal
          profileId={modalProfileId}
          onClose={() => setModalProfileId(null)}
          variant={activeTab === 'sent' ? 'sent' : 'received'}
          onInterested={(id) => { setModalProfileId(null); respondToReceived(id, 'interested'); }}
          onSkip={(id) => { setModalProfileId(null); respondToReceived(id, 'decline'); }}
          onWithdraw={(id) => { setModalProfileId(null); withdrawSent(id); }}
        />
      )}
    </div>
  );
}

function MiniCard({ profile, onClickName, children }: { profile: MiniProfile; onClickName: () => void; children?: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="relative h-40 bg-gradient-to-br from-accent-light to-accent/30 overflow-hidden">
        {profile.photoUri ? (
          <img src={profile.photoUri} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary/50" />
          </div>
        )}
        <div className="absolute bottom-0 inset-x-0 bg-foreground/60 backdrop-blur-sm text-surface text-[10px] px-2.5 py-1.5 flex items-center gap-1.5">
          <Lock className="w-3 h-3 shrink-0" />
          <span>Photo visible only after mutual interest</span>
        </div>
      </div>
      <div className="p-3">
        <button onClick={onClickName} className="text-sm font-semibold text-foreground truncate hover:text-primary transition-colors text-left">
          {profile.alias}, {profile.age}
        </button>
        {profile.profession && (
          <span className="inline-flex items-center gap-1 mt-1 text-xs text-muted truncate">
            <Briefcase className="w-3 h-3 shrink-0" /> {profile.profession}
          </span>
        )}
        {children}
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-24 bg-surface rounded-3xl border border-border">
      <p className="text-muted">{message}</p>
    </div>
  );
}

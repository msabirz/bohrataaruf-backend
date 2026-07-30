'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Heart, ArrowRight } from 'lucide-react';

type MatchDetail = {
  matchId: string;
  profileId: string;
  realName: string;
  realPhotoUri: string | null;
  age: number;
  city: string;
  handoffStatus: 'action_required' | 'waiting_on_them' | 'waiting_on_me' | 'complete';
  platformsSharedByMe: string[];
  theirHandles?: Record<string, string>;
};

const PLATFORMS = ['Instagram', 'WhatsApp', 'Phone'];

export default function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [platform, setPlatform] = useState('Instagram');
  const [handle, setHandle] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const load = async () => {
    const res = await fetch(`/api/v1/matches/${id}`);
    if (res.ok) setMatch(await res.json());
    setIsLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim()) return;
    setIsSending(true);
    setSendError('');
    try {
      const res = await fetch('/api/v1/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: id, platform: platform.toLowerCase(), handle: handle.trim() }),
      });
      if (!res.ok) throw new Error('Failed to send');
      setHandle('');
      await load();
    } catch {
      setSendError('Something went wrong. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-background px-6">
        <div className="text-center">
          <p className="text-muted mb-4">This match could not be found.</p>
          <Link href="/interests" className="text-primary font-medium hover:underline">Back to Interests</Link>
        </div>
      </div>
    );
  }

  const alreadySharedThisPlatform = match.platformsSharedByMe.some(p => p.toLowerCase() === platform.toLowerCase());

  return (
    <div className="min-h-[calc(100vh-80px)] bg-background px-6 py-16 flex items-center justify-center">
      <div className="relative w-full max-w-lg rounded-[2rem] overflow-hidden border-2 border-accent/40 bg-gradient-to-b from-accent-light/60 via-surface to-surface shadow-lg">
        {/* Subtle bronze dot matrix pattern, same as the marketing hero */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #C9A96E 1px, transparent 0)`,
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(circle at top center, black 0%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(circle at top center, black 0%, transparent 80%)',
          }}
        />

        <div className="relative px-8 pt-12 pb-8 text-center">
          <div className="relative w-32 h-20 mx-auto mb-6">
            <div className="absolute left-0 top-0 w-20 h-20 rounded-full bg-accent-light border-2 border-accent" />
            <div className="absolute right-0 top-0 w-20 h-20 rounded-full bg-accent/80 border-2 border-primary flex items-center justify-center">
              <Heart className="w-7 h-7 text-surface fill-surface" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">A meaningful beginning</h1>
          <p className="text-muted text-sm">You and {match.realName} have both said yes</p>
        </div>

        <div className="relative bg-surface mx-6 mb-8 rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center gap-4 p-6 border-b border-border">
            <div className="w-16 h-16 rounded-full bg-muted/20 border border-border overflow-hidden shrink-0">
              {match.realPhotoUri && <img src={match.realPhotoUri} alt={match.realName} className="w-full h-full object-cover" />}
            </div>
            <div>
              <p className="font-bold text-foreground text-lg">{match.realName}</p>
              <p className="text-sm text-muted">{match.age} &middot; {match.city}</p>
            </div>
          </div>

          <div className="p-6">
            {match.handoffStatus === 'complete' && match.theirHandles ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted mb-3">Their contact details</p>
                <div className="space-y-2">
                  {Object.entries(match.theirHandles).map(([p, h]) => (
                    <div key={p} className="flex justify-between items-center bg-background rounded-xl px-4 py-2.5 text-sm">
                      <span className="text-muted capitalize">{p}</span>
                      <span className="font-medium text-foreground">{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSend}>
                <p className="text-xs font-bold uppercase tracking-wide text-muted mb-3">Share your handle to connect</p>
                <div className="flex gap-2 mb-2">
                  <select
                    value={platform}
                    onChange={e => setPlatform(e.target.value)}
                    className="px-3 py-3 rounded-xl border border-border bg-background text-sm"
                  >
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input
                    type="text"
                    required
                    value={handle}
                    onChange={e => setHandle(e.target.value)}
                    placeholder={`${platform} handle`}
                    className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-sm"
                  />
                  <button
                    type="submit"
                    disabled={isSending}
                    className="bg-primary text-surface font-semibold px-5 rounded-xl disabled:opacity-50 text-sm"
                  >
                    {isSending ? 'Sending...' : 'Send'}
                  </button>
                </div>
                {sendError && <p className="text-danger text-xs">{sendError}</p>}
                {alreadySharedThisPlatform && <p className="text-primary text-xs mt-1">Already shared — sending again will update it.</p>}
                <p className="text-xs text-muted mt-3">
                  {match.handoffStatus === 'waiting_on_them'
                    ? "You've shared your details. Waiting for them to share theirs."
                    : match.handoffStatus === 'waiting_on_me'
                    ? 'They’ve shared their details — share yours to see them.'
                    : 'Nothing is shared until you choose to send it.'}
                </p>
              </form>
            )}
          </div>
        </div>

        <div className="relative text-center pb-8">
          <Link href="/discover" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            Continue browsing <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

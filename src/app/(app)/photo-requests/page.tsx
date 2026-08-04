'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Check, X as XIcon, Clock, ShieldOff } from 'lucide-react';

type RequestItem = {
  viewerId: string;
  alias: string;
  photoUri: string | null;
};

type GrantItem = {
  viewerId: string;
  alias: string;
  photoUri: string | null;
  grantedUntil: string | null;
};

type TabKey = 'pending' | 'granted';

const DURATION_OPTIONS: { value: '24h' | '48h' | 'permanent'; label: string }[] = [
  { value: '24h', label: '24 hours' },
  { value: '48h', label: '48 hours' },
  { value: 'permanent', label: 'Permanent' },
];

export default function PhotoRequestsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [requests, setRequests] = useState<RequestItem[] | null>(null);
  const [grants, setGrants] = useState<GrantItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    const res = await fetch('/api/v1/matching/photo-view-requests');
    const data = await res.json();
    setRequests(data.requests || []);
  }, []);

  const loadGrants = useCallback(async () => {
    const res = await fetch('/api/v1/matching/photo-view-grants');
    const data = await res.json();
    setGrants(data.grants || []);
  }, []);

  useEffect(() => {
    loadRequests();
    loadGrants();
  }, [loadRequests, loadGrants]);

  const approve = async (viewerId: string, duration: '24h' | '48h' | 'permanent') => {
    setBusyId(viewerId);
    try {
      await fetch(`/api/v1/matching/photo-view-request/${viewerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'approve', duration }),
      });
      setRequests(prev => (prev || []).filter(r => r.viewerId !== viewerId));
      loadGrants();
    } finally {
      setBusyId(null);
      setApprovingId(null);
    }
  };

  const decline = async (viewerId: string) => {
    setBusyId(viewerId);
    try {
      await fetch(`/api/v1/matching/photo-view-request/${viewerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'deny' }),
      });
      setRequests(prev => (prev || []).filter(r => r.viewerId !== viewerId));
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async (viewerId: string) => {
    setBusyId(viewerId);
    try {
      await fetch(`/api/v1/matching/photo-view-grants/${viewerId}/revoke`, { method: 'POST' });
      setGrants(prev => (prev || []).filter(g => g.viewerId !== viewerId));
    } finally {
      setBusyId(null);
    }
  };

  const renderPhoto = (photoUri: string | null) => (
    photoUri ? (
      <img src={photoUri} alt="" className="w-14 h-14 rounded-full object-cover shrink-0" />
    ) : (
      <div className="w-14 h-14 rounded-full bg-accent-light shrink-0" />
    )
  );

  return (
    <div className="min-h-screen bg-background pt-12 pb-32 px-6">
      <div className="container mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Photo Requests</h1>
        <p className="text-muted text-sm mb-6">Manage who has asked to view your photo, and who currently has access.</p>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'pending' ? 'bg-primary text-surface' : 'bg-surface border border-border text-foreground'}`}
          >
            Pending {requests && requests.length > 0 ? `(${requests.length})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('granted')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'granted' ? 'bg-primary text-surface' : 'bg-surface border border-border text-foreground'}`}
          >
            Granted Access {grants && grants.length > 0 ? `(${grants.length})` : ''}
          </button>
        </div>

        {activeTab === 'pending' && (
          requests === null ? (
            <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          ) : requests.length === 0 ? (
            <p className="text-muted text-sm">No pending photo requests.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <div key={r.viewerId} className="bg-surface border border-border rounded-2xl p-4">
                  <div className="flex items-center gap-4">
                    {renderPhoto(r.photoUri)}
                    <p className="font-medium text-foreground flex-1">{r.alias}</p>
                  </div>
                  {approvingId === r.viewerId ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted mr-1">Allow for:</span>
                      {DURATION_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => approve(r.viewerId, opt.value)}
                          disabled={busyId === r.viewerId}
                          className="px-3 py-1.5 rounded-full text-xs font-medium border border-border hover:bg-background transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                      <button
                        onClick={() => setApprovingId(null)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium text-muted hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-3">
                      <button
                        onClick={() => setApprovingId(r.viewerId)}
                        disabled={busyId === r.viewerId}
                        className="flex-1 bg-primary text-surface font-semibold py-2 rounded-xl text-sm flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4" /> Approve
                      </button>
                      <button
                        onClick={() => decline(r.viewerId)}
                        disabled={busyId === r.viewerId}
                        className="flex-1 border border-border text-foreground font-medium py-2 rounded-xl text-sm flex items-center justify-center gap-1.5"
                      >
                        <XIcon className="w-4 h-4" /> Decline
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'granted' && (
          grants === null ? (
            <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          ) : grants.length === 0 ? (
            <p className="text-muted text-sm">No one currently has approved access to your photo.</p>
          ) : (
            <div className="space-y-3">
              {grants.map((g) => (
                <div key={g.viewerId} className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-4">
                  {renderPhoto(g.photoUri)}
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{g.alias}</p>
                    <p className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {g.grantedUntil ? `Until ${new Date(g.grantedUntil).toLocaleString()}` : 'Permanent access'}
                    </p>
                  </div>
                  <button
                    onClick={() => revoke(g.viewerId)}
                    disabled={busyId === g.viewerId}
                    className="px-4 py-2 rounded-xl border border-danger/30 text-danger text-sm font-medium flex items-center gap-1.5 hover:bg-danger/10 transition-colors"
                  >
                    <ShieldOff className="w-4 h-4" /> Revoke
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

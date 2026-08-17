'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, Lock, LogOut, Trash2, Image as ImageIcon, ChevronRight, Sparkles } from 'lucide-react';
import { LifestyleToggle, TraitPair } from '@/components/app/LifestyleToggle';
import { PasswordInput } from '@/components/ui/PasswordInput';

type PushPrefs = {
  matchesEnabled: boolean;
  receivedInterestsEnabled: boolean;
  verificationUpdatesEnabled: boolean;
  handoffUpdatesEnabled: boolean;
  photoRequestsEnabled: boolean;
};

const TOGGLE_LABELS: { key: keyof PushPrefs; label: string; description: string }[] = [
  { key: 'matchesEnabled', label: 'New matches', description: 'When you and someone both express interest' },
  { key: 'receivedInterestsEnabled', label: 'Received interest', description: 'When someone expresses interest in you' },
  { key: 'verificationUpdatesEnabled', label: 'Verification updates', description: 'Status changes on your ITS verification' },
  { key: 'handoffUpdatesEnabled', label: 'Connection updates', description: 'When a match shares their contact details' },
  { key: 'photoRequestsEnabled', label: 'Photo requests', description: 'New requests to view your photo, and responses to yours' },
];

type Mode = 'always' | 'three_then_request' | 'request_only' | 'blur_until_match';

const MODE_LABELS: Record<Mode, { label: string; description: string }> = {
  always: { label: 'Show my photo', description: 'Always visible to everyone, no blur' },
  three_then_request: { label: 'Show 3 times, then allow request', description: 'Free peeks first, then viewers can ask for more' },
  request_only: { label: 'Show only on request', description: 'Every view must be requested and approved by you' },
  blur_until_match: { label: 'Blur until match', description: 'Photo stays blurred until you mutually match' },
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${checked ? 'bg-primary' : 'bg-border'}`}
      aria-pressed={checked}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-surface shadow-sm transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<PushPrefs | null>(null);
  const [prefsMessage, setPrefsMessage] = useState('');

  const [photoMode, setPhotoMode] = useState<Mode | null>(null);
  const [allowedModes, setAllowedModes] = useState<Mode[]>([]);
  const [photoModeMessage, setPhotoModeMessage] = useState('');
  const [isSavingPhotoMode, setIsSavingPhotoMode] = useState(false);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  const [traitPairs, setTraitPairs] = useState<TraitPair[]>([]);
  const [lifestyleAnswers, setLifestyleAnswers] = useState<Record<string, string>>({});
  const [lifestyleMessage, setLifestyleMessage] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetch('/api/v1/notifications/preferences').then(r => r.json()).then(setPrefs).catch(() => {});
    fetch('/api/v1/profile/photo-privacy-options').then(r => r.json()).then(d => {
      if (d.allowedModes) setAllowedModes(d.allowedModes);
    }).catch(() => {});
    fetch('/api/v1/profile').then(r => r.json()).then(d => {
      if (d.photoPrivacyMode) setPhotoMode(d.photoPrivacyMode);
      if (d.lifestyleAnswers) setLifestyleAnswers(d.lifestyleAnswers);
    }).catch(() => {});
    fetch('/api/v1/matching/photo-view-requests').then(r => r.json()).then(d => {
      setPendingRequestCount((d.requests || []).length);
    }).catch(() => {});
    fetch('/api/v1/lifestyle-traits').then(r => r.json()).then(d => {
      setTraitPairs(d.pairs || []);
    }).catch(() => {});
  }, []);

  const savePhotoMode = async (mode: Mode) => {
    const prevMode = photoMode;
    setPhotoMode(mode);
    setPhotoModeMessage('');
    setIsSavingPhotoMode(true);
    try {
      const res = await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoPrivacyMode: mode }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPhotoMode(prevMode);
      setPhotoModeMessage('Failed to update — please try again.');
    } finally {
      setIsSavingPhotoMode(false);
    }
  };

  const togglePref = async (key: keyof PushPrefs) => {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setPrefsMessage('');
    try {
      const res = await fetch('/api/v1/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: next[key] }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPrefs(prefs); // revert on failure
      setPrefsMessage('Failed to update — please try again.');
    }
  };

  const handleLifestyleChange = async (slug: string, optionKey: string) => {
    const prev = lifestyleAnswers;
    const next = { ...lifestyleAnswers, [slug]: optionKey };
    setLifestyleAnswers(next);
    setLifestyleMessage('');
    try {
      const res = await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lifestyleAnswers: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setLifestyleAnswers(prev); // revert on failure
      setLifestyleMessage('Failed to update — please try again.');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPassword(true);
    setPasswordMessage('');
    try {
      const res = await fetch('/api/v1/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) throw new Error();
      setPasswordMessage('Password updated successfully.');
      setNewPassword('');
    } catch {
      setPasswordMessage('Failed to update password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/v1/profile', { method: 'DELETE' });
      if (res.ok) {
        router.push('/');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-12 pb-32 px-6">
      <div className="container mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>

        <Link
          href="/verification"
          className="flex items-center justify-between bg-surface p-6 rounded-3xl border border-border shadow-sm hover:bg-background transition-colors"
        >
          <span className="text-sm font-semibold text-foreground">ITS Verification</span>
          <ChevronRight className="w-4 h-4 text-muted" />
        </Link>

        <section className="bg-surface p-8 rounded-3xl border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Notification Preferences</h2>
          </div>
          {!prefs ? (
            <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          ) : (
            <div className="space-y-5">
              {TOGGLE_LABELS.map(({ key, label, description }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted">{description}</p>
                  </div>
                  <Toggle checked={prefs[key]} onChange={() => togglePref(key)} />
                </div>
              ))}
              {prefsMessage && <p className="text-danger text-xs">{prefsMessage}</p>}
            </div>
          )}
        </section>

        <section className="bg-surface p-8 rounded-3xl border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <ImageIcon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Photo Privacy</h2>
          </div>
          {!photoMode || allowedModes.length === 0 ? (
            <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          ) : (
            <div className="space-y-3">
              {allowedModes.map((mode) => (
                <label
                  key={mode}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${photoMode === mode ? 'border-primary bg-accent-light/20' : 'border-border hover:bg-background'}`}
                >
                  <input
                    type="radio"
                    name="photoMode"
                    checked={photoMode === mode}
                    onChange={() => savePhotoMode(mode)}
                    disabled={isSavingPhotoMode}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{MODE_LABELS[mode].label}</p>
                    <p className="text-xs text-muted">{MODE_LABELS[mode].description}</p>
                  </div>
                </label>
              ))}
              {photoModeMessage && <p className="text-danger text-xs">{photoModeMessage}</p>}
              <Link
                href="/photo-requests"
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-border hover:bg-background transition-colors mt-2"
              >
                <span className="text-sm font-medium text-foreground">
                  {pendingRequestCount > 0 ? `${pendingRequestCount} pending photo request${pendingRequestCount === 1 ? '' : 's'}` : 'Manage photo requests & access'}
                </span>
                <ChevronRight className="w-4 h-4 text-muted" />
              </Link>
            </div>
          )}
        </section>

        {traitPairs.length > 0 && (
          <section className="bg-surface p-8 rounded-3xl border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Lifestyle & Personality</h2>
            </div>
            <div className="space-y-6">
              {traitPairs.map((pair, index) => (
                <LifestyleToggle
                  key={pair.id}
                  pair={pair}
                  value={lifestyleAnswers[pair.slug]}
                  onChange={(optionKey) => handleLifestyleChange(pair.slug, optionKey)}
                  badgeDelay={index * 0.8}
                />
              ))}
              {lifestyleMessage && <p className="text-danger text-xs">{lifestyleMessage}</p>}
            </div>
          </section>
        )}

        <section className="bg-surface p-8 rounded-3xl border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Change Password</h2>
          </div>
          <form onSubmit={handlePasswordSubmit} className="flex gap-3">
            <PasswordInput
              required
              minLength={8}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="New password (min. 8 characters)"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm"
              wrapperClassName="relative flex-1"
            />
            <button
              type="submit"
              disabled={isSavingPassword}
              className="bg-primary text-surface font-semibold px-6 rounded-xl disabled:opacity-50 text-sm"
            >
              {isSavingPassword ? 'Saving...' : 'Update'}
            </button>
          </form>
          {passwordMessage && (
            <p className={`text-xs mt-2 ${passwordMessage.includes('success') ? 'text-primary' : 'text-danger'}`}>{passwordMessage}</p>
          )}
        </section>

        <section className="bg-surface p-8 rounded-3xl border border-border shadow-sm">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 border border-border text-foreground font-medium py-3 rounded-xl hover:bg-background transition-colors">
            <LogOut className="w-4 h-4" /> Log Out
          </button>
        </section>

        <section className="bg-surface p-8 rounded-3xl border border-danger/30 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Trash2 className="w-5 h-5 text-danger" />
            <h2 className="text-lg font-bold text-danger">Delete Account</h2>
          </div>
          <p className="text-sm text-muted mb-4">
            This permanently deletes your profile, matches, and all data. This cannot be undone.
          </p>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm font-medium text-danger border border-danger/30 px-5 py-2.5 rounded-xl hover:bg-danger/10 transition-colors"
            >
              Delete my account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-foreground">Type <strong>DELETE</strong> to confirm.</p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-danger/30 bg-background text-sm"
                placeholder="DELETE"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                  className="bg-danger text-surface font-bold px-5 py-2.5 rounded-xl disabled:opacity-40 text-sm"
                >
                  {isDeleting ? 'Deleting...' : 'Permanently Delete'}
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                  className="text-sm font-medium text-muted px-5 py-2.5 hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

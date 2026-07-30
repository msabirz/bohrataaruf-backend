'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Lock, LogOut, Trash2 } from 'lucide-react';

type PushPrefs = {
  matchesEnabled: boolean;
  receivedInterestsEnabled: boolean;
  verificationUpdatesEnabled: boolean;
  handoffUpdatesEnabled: boolean;
};

const TOGGLE_LABELS: { key: keyof PushPrefs; label: string; description: string }[] = [
  { key: 'matchesEnabled', label: 'New matches', description: 'When you and someone both express interest' },
  { key: 'receivedInterestsEnabled', label: 'Received interest', description: 'When someone expresses interest in you' },
  { key: 'verificationUpdatesEnabled', label: 'Verification updates', description: 'Status changes on your ITS verification' },
  { key: 'handoffUpdatesEnabled', label: 'Connection updates', description: 'When a match shares their contact details' },
];

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

  const [newPassword, setNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetch('/api/v1/notifications/preferences').then(r => r.json()).then(setPrefs).catch(() => {});
  }, []);

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
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Change Password</h2>
          </div>
          <form onSubmit={handlePasswordSubmit} className="flex gap-3">
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="New password (min. 8 characters)"
              className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-sm"
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

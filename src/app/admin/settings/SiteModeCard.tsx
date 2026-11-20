'use client';

import React, { useEffect, useState } from 'react';
import { formatDateTime } from '@/lib/formatDate';

interface ModeInfo {
  mode: 'A' | 'B';
  source: 'admin' | 'environment';
  environmentMode: 'A' | 'B';
  updatedAt: string | null;
  updatedByName: string | null;
}

const CHECKLIST = [
  'ITS verification reviews are still on hold until Raza Mubarak. Switching on Discover means people will see each other\'s profiles.',
  'The homepage changes to the launch page for everyone.',
  'Discover, Interests, matches and nearby will start working for all users.',
  'The menu for signed-in users adds Discover and Interests.',
];

export default function SiteModeCard() {
  const [info, setInfo] = useState<ModeInfo | null>(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<'A' | 'B' | null>(null);
  const [typed, setTyped] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;
    fetch('/api/admin/settings/site-mode').then(async (r) => {
      const d = await r.json();
      if (!alive) return;
      if (r.ok) setInfo(d); else setError(d.error || 'Could not load the setting');
    }).catch(() => alive && setError('Network error'));
    return () => { alive = false; };
  }, []);

  const apply = async (mode: 'A' | 'B') => {
    setSaving(true); setMessage('');
    const r = await fetch('/api/admin/settings/site-mode', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, confirm: mode === 'A' ? typed : undefined }),
    });
    const d = await r.json();
    setSaving(false);
    if (r.ok) {
      setInfo(d); setConfirming(null); setTyped('');
      setMessage(mode === 'A' ? 'The site is now in launch mode.' : 'The site is back in pre-launch mode.');
    } else setMessage(d.error || 'Could not save');
  };

  const isLaunch = info?.mode === 'A';

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5" aria-label="Site mode">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Site mode</h3>
          <p className="text-sm text-gray-500 mt-1">Pre-launch or launch. This is the switch for opening the whole site.</p>
        </div>
        {info && (
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${isLaunch ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
            {isLaunch ? 'Launch mode' : 'Pre-launch mode'}
          </span>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <div className={`rounded-lg border p-4 ${!isLaunch && info ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200'}`}>
          <div className="font-semibold text-gray-800">Pre-launch (B)</div>
          <ul className="mt-2 list-disc pl-5 text-gray-600 space-y-1">
            <li>Pre-launch homepage</li>
            <li>Discover, search, interests and nearby say &quot;Coming soon&quot;</li>
            <li>Signed-in menu: Profile, Share, Settings</li>
          </ul>
        </div>
        <div className={`rounded-lg border p-4 ${isLaunch ? 'border-green-300 bg-green-50/50' : 'border-gray-200'}`}>
          <div className="font-semibold text-gray-800">Launch (A)</div>
          <ul className="mt-2 list-disc pl-5 text-gray-600 space-y-1">
            <li>Full launch homepage</li>
            <li>Discover, search, interests and nearby work</li>
            <li>Signed-in menu adds Discover and Interests</li>
          </ul>
        </div>
      </div>

      {info && (
        <p className="text-xs text-gray-500">
          {info.source === 'admin'
            ? `Last changed ${formatDateTime(info.updatedAt)}${info.updatedByName ? ` by ${info.updatedByName}` : ''}.`
            : `Never changed here yet. It is following the SITE_MODE environment setting (${info.environmentMode}).`}
        </p>
      )}

      {message && <div className={`text-sm px-4 py-3 rounded-lg ${message.startsWith('The site') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{message}</div>}

      {info && !confirming && (
        <div className="flex gap-3">
          {isLaunch ? (
            <button onClick={() => setConfirming('B')} className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50">Switch back to pre-launch</button>
          ) : (
            <button onClick={() => { setConfirming('A'); setTyped(''); setMessage(''); }} className="px-5 py-2.5 rounded-lg bg-[#8C6A3F] hover:bg-[#7a5b35] text-white font-semibold">Switch to launch…</button>
          )}
        </div>
      )}

      {confirming === 'A' && (
        <div className="border-2 border-amber-300 bg-amber-50 rounded-xl p-5 space-y-4">
          <div className="font-semibold text-amber-900">Before you launch, please check:</div>
          <ul className="list-disc pl-5 text-sm text-amber-900 space-y-1.5">{CHECKLIST.map((c) => <li key={c}>{c}</li>)}</ul>
          <div>
            <label htmlFor="launch-confirm" className="block text-sm font-medium text-amber-900 mb-1.5">Type <strong>LAUNCH</strong> to confirm</label>
            <input id="launch-confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className="w-48 px-3 py-2 border border-amber-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8C6A3F]" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setConfirming(null); setTyped(''); }} disabled={saving} className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium bg-white">Cancel</button>
            <button onClick={() => apply('A')} disabled={saving || typed !== 'LAUNCH'} className="px-5 py-2.5 rounded-lg bg-[#8C6A3F] text-white font-semibold disabled:opacity-50">{saving ? 'Switching…' : 'Switch to launch'}</button>
          </div>
        </div>
      )}

      {confirming === 'B' && (
        <div className="border border-gray-300 bg-gray-50 rounded-xl p-5 space-y-4">
          <p className="text-sm text-gray-700">Switch back to pre-launch? Discover and the other features will say &quot;Coming soon&quot; again, and the pre-launch homepage returns.</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirming(null)} disabled={saving} className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium bg-white">Cancel</button>
            <button onClick={() => apply('B')} disabled={saving} className="px-5 py-2.5 rounded-lg bg-gray-800 text-white font-semibold disabled:opacity-50">{saving ? 'Switching…' : 'Switch to pre-launch'}</button>
          </div>
        </div>
      )}
    </section>
  );
}

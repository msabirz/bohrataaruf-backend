'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { formatDate } from '@/lib/formatDate';

interface Stats {
  days: number;
  totals: {
    emailsSent: number; usersEmailed: number; linksMade: number; usersWithLinks: number;
    opens: number; usersOpenedByOthers: number; signupsFromLinks: number; sharingOff: number;
  };
  outcomes: Partial<Record<'active' | 'used' | 'expired' | 'stopped', number>>;
  series: { day: string; opens: number }[];
  sources: { source: string; n: number }[];
}
interface Promo { promoText: string; joinLabel: string; instagramUrl: string; siteUrl: string }

const SOURCE_LABEL: Record<string, string> = { whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook', direct: 'Direct or unknown', other: 'Other' };
const OUTCOME_LABEL: Record<string, string> = { active: 'Active', used: 'Used once', expired: 'Expired', stopped: 'Stopped or switched off' };

function Kpi({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</div>
      <div className="text-sm font-medium text-gray-600 mt-1">{label}</div>
      {hint && <div className="text-xs text-gray-400 mt-0.5">{hint}</div>}
    </div>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-44 text-gray-700 shrink-0">{label}</div>
      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden"><div className="h-3 rounded-full bg-[#8C6A3F]" style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }} /></div>
      <div className="w-12 text-right font-semibold text-gray-900">{value}</div>
    </div>
  );
}

export default function AdminSharePanel() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const [promo, setPromo] = useState<Promo | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/share/stats?days=${days}`).then(async (r) => {
      const d = await r.json();
      if (!alive) return;
      if (r.ok) { setStats(d); setError(''); } else setError(d.error || 'Could not load the numbers');
    }).catch(() => alive && setError('Network error'));
    return () => { alive = false; };
  }, [days]);

  useEffect(() => {
    let alive = true;
    fetch('/api/admin/share/promo').then(async (r) => { const d = await r.json(); if (alive && r.ok) setPromo(d); });
    return () => { alive = false; };
  }, []);

  const save = useCallback(async () => {
    if (!promo) return;
    setSaving(true); setSaveMsg('');
    const r = await fetch('/api/admin/share/promo', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(promo) });
    const d = await r.json();
    setSaving(false);
    if (r.ok) { setPromo(d); setSaveMsg('Saved. New and existing shared pages use this text now.'); } else setSaveMsg(d.error || 'Could not save');
  }, [promo]);

  const maxOpens = Math.max(1, ...(stats?.series.map((s) => s.opens) ?? [1]));
  const t = stats?.totals;
  const field = 'w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#8C6A3F] text-sm';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Share Profile</h2>
        <p className="text-gray-500 text-sm mt-1">Totals only. No names or individual activity are shown here. To email a user the share link, use <strong>Send share link</strong> on the Users page.</p>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      <section className="space-y-4" aria-label="Analytics">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Analytics</h3>
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => setDays(d)} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${days === d ? 'bg-[#8C6A3F] text-white' : 'bg-white border border-gray-300 text-gray-600'}`}>{d} days</button>
            ))}
          </div>
        </div>

        {t ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Kpi label="Share emails sent" value={t.emailsSent} hint={`to ${t.usersEmailed} users`} />
              <Kpi label="Links made" value={t.linksMade} hint={`by ${t.usersWithLinks} users`} />
              <Kpi label="Opens (all time)" value={t.opens} hint="real people, not chat previews" />
              <Kpi label="Signups from shared links" value={t.signupsFromLinks} />
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h4 className="font-semibold text-gray-800 mb-3">Opens per day (last {stats?.days} days)</h4>
                <div className="flex items-end gap-[3px] h-32" role="img" aria-label="Opens per day">
                  {stats?.series.map((s) => (
                    <div key={s.day} title={`${formatDate(s.day)}: ${s.opens}`} className="flex-1 rounded-t bg-[#C9A96E]" style={{ height: `${Math.max(3, (s.opens / maxOpens) * 100)}%`, opacity: s.opens ? 1 : 0.3 }} />
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
                <h4 className="font-semibold text-gray-800">Funnel</h4>
                <Bar label="Emailed" value={t.usersEmailed} max={Math.max(t.usersEmailed, 1)} />
                <Bar label="Made a link" value={t.usersWithLinks} max={Math.max(t.usersEmailed, t.usersWithLinks, 1)} />
                <Bar label="Link opened by someone" value={t.usersOpenedByOthers} max={Math.max(t.usersEmailed, t.usersWithLinks, 1)} />
                <p className="text-xs text-gray-400">Users who made a link without an email from you are counted too, so a later step can be larger than an earlier one.</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
                <h4 className="font-semibold text-gray-800">What happened to the links</h4>
                {(['active', 'used', 'expired', 'stopped'] as const).map((k) => (
                  <Bar key={k} label={OUTCOME_LABEL[k]} value={stats?.outcomes[k] ?? 0} max={Math.max(t.linksMade, 1)} />
                ))}
                <p className="text-xs text-gray-400">{t.sharingOff} users have sharing switched off.</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
                <h4 className="font-semibold text-gray-800">Where opens came from (last {stats?.days} days)</h4>
                {stats && stats.sources.length === 0 && <p className="text-sm text-gray-400">No opens in this period.</p>}
                {stats?.sources.map((s) => (
                  <Bar key={s.source} label={SOURCE_LABEL[s.source] ?? s.source} value={s.n} max={stats.sources[0]?.n || 1} />
                ))}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-xl p-4">
              <strong>Not counted here:</strong> taps on the Join or Instagram buttons (need a paid Vercel plan), and whether emails were delivered or opened (see your email provider&apos;s own report).
            </div>
          </>
        ) : !error && <div className="text-gray-500 text-sm">Loading numbers...</div>}
      </section>

      <section className="space-y-4" aria-label="Promo text">
        <h3 className="text-lg font-semibold text-gray-800">Text at the bottom of every shared page</h3>
        {promo ? (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
              <label className="block text-sm font-medium text-gray-700">Message
                <textarea rows={3} maxLength={200} value={promo.promoText} onChange={(e) => setPromo({ ...promo, promoText: e.target.value })} className={`${field} mt-1`} />
              </label>
              <label className="block text-sm font-medium text-gray-700">Join button text
                <input maxLength={40} value={promo.joinLabel} onChange={(e) => setPromo({ ...promo, joinLabel: e.target.value })} className={`${field} mt-1`} />
              </label>
              <p className="text-xs text-gray-500 -mt-2">The Join button opens the signup page. A code for the link is added automatically.</p>
              <label className="block text-sm font-medium text-gray-700">Instagram address
                <input value={promo.instagramUrl} onChange={(e) => setPromo({ ...promo, instagramUrl: e.target.value })} className={`${field} mt-1`} />
              </label>
              <label className="block text-sm font-medium text-gray-700">Website address
                <input value={promo.siteUrl} onChange={(e) => setPromo({ ...promo, siteUrl: e.target.value })} className={`${field} mt-1`} />
              </label>
              <div className="flex items-center gap-3">
                <button onClick={save} disabled={saving} className="px-5 py-2 rounded-lg bg-[#8C6A3F] text-white text-sm font-semibold disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
                {saveMsg && <span className={`text-sm ${saveMsg.startsWith('Saved') ? 'text-green-700' : 'text-red-700'}`}>{saveMsg}</span>}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Preview</div>
              <div className="rounded-2xl text-white px-6 py-8 text-center" style={{ background: 'linear-gradient(135deg, #3F2A16, #6E4520)' }}>
                <p className="text-xs tracking-wide uppercase text-[#E8D3A8] font-semibold">Bohra Taaruf is awaiting Raza Mubarak</p>
                <p className="mt-3 text-lg leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>{promo.promoText}</p>
                <div className="mt-5 flex gap-3 justify-center flex-wrap">
                  <span className="px-6 py-2.5 rounded-full font-bold text-[#3F2A16] bg-[#C9A24B] text-sm">{promo.joinLabel}</span>
                  <span className="px-5 py-2.5 rounded-full font-semibold border border-[#C9A24B] text-[#F3E3C8] text-sm">Follow @bohrataaruf</span>
                </div>
                <p className="mt-4 text-xs text-[#E8D3A8] underline">Visit bohrataaruf.com</p>
              </div>
            </div>
          </div>
        ) : <div className="text-gray-500 text-sm">Loading...</div>}
      </section>
    </div>
  );
}

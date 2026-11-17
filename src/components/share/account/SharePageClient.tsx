'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Copy, Check, ShieldAlert, Trash2, Eye } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { SHARE_FIELD_KEYS, SHARE_FIELD_LABELS, type ShareFieldKey } from '@/lib/share/fields';

type LinkStatus = 'active' | 'used' | 'expired' | 'stopped';
type ExpiryKind = 'one_view' | '24h' | '3d' | '7d' | '30d';

interface LinkDto {
  id: string; label: string; token: string; path: string; expiryKind: ExpiryKind; status: LinkStatus;
  createdAt: string; expiresAt: string; usedAt: string | null; stoppedAt: string | null;
  opens: number; lastOpenedAt: string | null; joined: number;
}
interface Settings {
  sharingEnabled: boolean; nameMode: 'first' | 'full'; photoMode: 'blurred' | 'own';
  visibleFields: ShareFieldKey[]; maxActiveLinks: number;
}
interface Overview {
  settings: Settings;
  details: { id: string; label: string; value: string }[];
  links: LinkDto[];
  activeCount: number;
  totals: { links: number; opens: number; joined: number };
}
interface LinkDetail { link: LinkDto; opens: { openedAt: string; device: string; source: string }[] }
interface Activity { days: number; series: { day: string; opens: number }[]; totalOpens: number }

const KIND_LABEL: Record<ExpiryKind, string> = { one_view: 'One view only', '24h': '24 hours', '3d': '3 days', '7d': '7 days', '30d': '30 days' };
const STATUS_STYLE: Record<LinkStatus, string> = {
  active: 'bg-[#DDEFE3] text-[#1F6B3F]',
  used: 'bg-[#E3E0DA] text-[#5B534A]',
  expired: 'bg-[#F4D9D2] text-[#B4442F]',
  stopped: 'bg-[#F4D9D2] text-[#B4442F]',
};
const STATUS_LABEL: Record<LinkStatus, string> = { active: 'Active', used: 'Used once', expired: 'Expired', stopped: 'Stopped' };
const DETAIL_SUGGESTIONS = ["Father's name", "Father's business", "Mother's name", 'Native place', 'Family background'];
const SERIF = { fontFamily: "Georgia, 'Times New Roman', serif" } as const;

function fmt(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}
const DEVICE_LABEL: Record<string, string> = { iphone: 'iPhone', android: 'Android', desktop: 'Computer', other: 'Other device' };
const SOURCE_LABEL: Record<string, string> = { whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook', direct: 'Direct', other: 'Other' };

async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const res = await fetch(`/api/v1/share${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: Record<string, unknown> = {};
  try { data = await res.json(); } catch { /* empty */ }
  return { ok: res.ok, status: res.status, data: data as T & { error?: string } };
}

function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={onChange}
      className={`w-11 h-6 rounded-full relative transition-colors shrink-0 disabled:opacity-50 ${checked ? 'bg-[#2E7D4F]' : 'bg-border'}`}>
      <span className={`absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-surface shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex bg-background border border-border rounded-full p-1">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${value === o.value ? 'bg-primary text-surface' : 'text-muted'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function whatsappUrl(link: { label: string; expiryKind: ExpiryKind }, url: string) {
  let msg = `Salaam, here is a biodata shared with you on Bohra Taaruf:\n${url}`;
  if (link.expiryKind === 'one_view') {
    msg += '\n\nThis is a one-time link. Please copy it and open it in your browser (not inside WhatsApp), because it works only once.';
  }
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

export function SharePageClient() {
  const [data, setData] = useState<Overview | null>(null);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<'links' | 'share' | 'activity'>('links');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const r = await api<Overview>('GET', '');
    if (r.ok) { setData(r.data as Overview); setLoadError(''); } else setLoadError(r.data.error || 'Could not load. Please try again.');
  }, []);
  useEffect(() => {
    let alive = true;
    api<Overview>('GET', '').then((r) => {
      if (!alive) return;
      if (r.ok) setData(r.data as Overview); else setLoadError(r.data.error || 'Could not load. Please try again.');
    });
    return () => { alive = false; };
  }, []);

  if (loadError) return <div className="container mx-auto max-w-[920px] px-6 pt-10 text-[#B4442F]">{loadError}</div>;
  if (!data) {
    return <div className="min-h-[50vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  const tabCls = (t: string) => `pb-3 text-[15px] font-semibold border-b-[3px] transition-colors ${tab === t ? 'text-foreground border-primary' : 'text-muted border-transparent hover:text-foreground'}`;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container mx-auto max-w-[920px] px-6 pt-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold text-foreground" style={SERIF}>Share my profile</h1>
            <p className="text-muted mt-1">Make a private link, choose what it shows, and see who opened it.</p>
          </div>
          <SharingSwitch data={data} reload={load} setMessage={setMessage} />
        </div>

        {message && <div className="mt-4 bg-primary/10 text-primary text-sm font-medium px-4 py-3 rounded-xl">{message}</div>}

        <div className="mt-6 flex gap-8 border-b border-border" role="tablist">
          <button role="tab" aria-selected={tab === 'links'} className={tabCls('links')} onClick={() => setTab('links')}>Links</button>
          <button role="tab" aria-selected={tab === 'share'} className={tabCls('share')} onClick={() => setTab('share')}>What I share</button>
          <button role="tab" aria-selected={tab === 'activity'} className={tabCls('activity')} onClick={() => setTab('activity')}>Activity</button>
        </div>

        <div className="mt-6">
          {tab === 'links' && <LinksTab data={data} reload={load} setMessage={setMessage} />}
          {tab === 'share' && <WhatIShareTab data={data} reload={load} setMessage={setMessage} />}
          {tab === 'activity' && <ActivityTab data={data} />}
        </div>
      </div>
    </div>
  );
}

// ── Master switch ────────────────────────────────────────────────────────────
function SharingSwitch({ data, reload, setMessage }: { data: Overview; reload: () => Promise<void>; setMessage: (m: string) => void }) {
  const [confirmOff, setConfirmOff] = useState(false);
  const [busy, setBusy] = useState(false);
  const on = data.settings.sharingEnabled;

  const set = async (enabled: boolean) => {
    setBusy(true);
    const r = await api('PATCH', '/settings', { sharingEnabled: enabled });
    setBusy(false);
    setConfirmOff(false);
    if (r.ok) { await reload(); setMessage(enabled ? 'Sharing is on.' : 'Sharing is off. All your links have stopped.'); }
    else setMessage(r.data.error || 'Something went wrong.');
  };

  return (
    <>
      <div className="flex items-center gap-3 bg-surface border border-border rounded-full pl-5 pr-3 py-2 shadow-sm">
        <span className={`text-sm font-bold ${on ? 'text-[#1F6B3F]' : 'text-muted'}`}>{on ? 'Sharing is on' : 'Sharing is off'}</span>
        <Switch checked={on} label="Sharing" disabled={busy} onChange={() => (on ? setConfirmOff(true) : set(true))} />
      </div>
      <Modal open={confirmOff} onClose={() => setConfirmOff(false)} title="Switch off sharing?"
        footer={
          <div className="flex gap-3 justify-end">
            <button onClick={() => setConfirmOff(false)} className="px-5 py-2.5 rounded-full font-semibold text-primary">Keep sharing</button>
            <button onClick={() => set(false)} disabled={busy} className="px-5 py-2.5 rounded-full font-bold bg-[#B4442F] text-white disabled:opacity-60">Switch off</button>
          </div>
        }>
        <p className="text-foreground leading-relaxed">Every link you have made will stop working straight away, for good. If you switch sharing on again later, you will need to make new links.</p>
      </Modal>
    </>
  );
}

// ── Links tab ────────────────────────────────────────────────────────────────
function LinksTab({ data, reload, setMessage }: { data: Overview; reload: () => Promise<void>; setMessage: (m: string) => void }) {
  const [makeOpen, setMakeOpen] = useState(false);
  const { settings, links, activeCount } = data;
  const joinedLinks = links.filter((l) => l.joined > 0);
  const live = links.filter((l) => l.status === 'active');
  const ended = links.filter((l) => l.status !== 'active');

  return (
    <div className="flex flex-col gap-5">
      {!settings.sharingEnabled && (
        <div className="bg-[#FBF1D3] text-[#5B4308] rounded-2xl px-5 py-4 text-sm font-medium">Sharing is off. Switch it on above to make a new link.</div>
      )}
      {joinedLinks.map((l) => (
        <div key={l.id} className="bg-[#DDEFE3] text-[#1F6B3F] rounded-2xl px-5 py-3.5 text-sm font-semibold">
          {l.joined === 1 ? '1 person' : `${l.joined} people`} joined Bohra Taaruf from your “{l.label}” link
        </div>
      ))}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted">{activeCount} of {settings.maxActiveLinks} links active</div>
        <div className="flex items-center gap-3">
          <Link href="/share/preview" target="_blank" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border text-sm font-semibold text-primary bg-surface"><Eye className="w-4 h-4" /> Preview</Link>
          <button onClick={() => setMakeOpen(true)} disabled={!settings.sharingEnabled}
            className="px-6 py-2.5 rounded-full bg-primary text-surface font-bold disabled:opacity-50">Make a new link</button>
        </div>
      </div>

      {links.length === 0 && (
        <div className="bg-surface border border-border rounded-2xl px-6 py-10 text-center text-muted">
          You have no links yet. Make one, then send it on WhatsApp.
        </div>
      )}
      {live.length > 0 && <div className="flex flex-col gap-3">{live.map((l) => <LinkRow key={l.id} link={l} reload={reload} setMessage={setMessage} />)}</div>}
      {ended.length > 0 && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted mb-3">Ended links</h2>
          <div className="flex flex-col gap-3">{ended.map((l) => <LinkRow key={l.id} link={l} reload={reload} setMessage={setMessage} />)}</div>
          <p className="text-xs text-muted mt-3">We keep the open history of a link for 90 days.</p>
        </div>
      )}

      <MakeLinkModal open={makeOpen} onClose={() => setMakeOpen(false)} onCreated={reload} setMessage={setMessage} />
    </div>
  );
}

function LinkRow({ link, reload, setMessage }: { link: LinkDto; reload: () => Promise<void>; setMessage: (m: string) => void }) {
  const [copied, setCopied] = useState(false);
  const [detail, setDetail] = useState<LinkDetail | null>(null);
  const [stopOpen, setStopOpen] = useState(false);
  const url = typeof window === 'undefined' ? '' : `${window.location.origin}${link.path}`;
  const isActive = link.status === 'active';

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { setMessage('Could not copy. Press and hold the link to copy it.'); }
  };
  const toggleDetail = async () => {
    if (detail) { setDetail(null); return; }
    const r = await api<LinkDetail>('GET', `/links/${link.id}`);
    if (r.ok) setDetail(r.data as LinkDetail);
  };
  const stop = async () => {
    const r = await api('POST', `/links/${link.id}/stop`);
    setStopOpen(false);
    if (r.ok) { await reload(); setMessage(`“${link.label}” has been stopped.`); } else setMessage(r.data.error || 'Could not stop the link.');
  };

  return (
    <div className="bg-surface border border-border rounded-2xl px-5 py-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <div className="font-bold text-foreground">{link.label}</div>
          <div className="text-sm text-muted">
            {KIND_LABEL[link.expiryKind]} · {link.opens} {link.opens === 1 ? 'open' : 'opens'}
            {link.lastOpenedAt ? ` · last ${fmt(link.lastOpenedAt)}` : ''}
            {isActive ? ` · until ${fmt(link.expiresAt)}` : ''}
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_STYLE[link.status]}`}>{STATUS_LABEL[link.status]}</span>
        {isActive && (
          <>
            <button onClick={copy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-primary text-primary text-sm font-bold">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy'}
            </button>
            <a href={whatsappUrl(link, url)} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-full bg-[#25A55A] text-white text-sm font-bold">WhatsApp</a>
            <button onClick={() => setStopOpen(true)} className="px-4 py-2 rounded-full border border-[#B4442F] text-[#B4442F] text-sm font-bold">Stop</button>
          </>
        )}
        <button onClick={toggleDetail} className="text-sm font-semibold text-primary underline underline-offset-4">{detail ? 'Hide' : 'Details'}</button>
      </div>
      {isActive && link.expiryKind === 'one_view' && (
        <p className="mt-3 text-sm bg-[#FBF1D3] text-[#5B4308] rounded-xl px-4 py-2.5">
          One-time link. Tell them to open it in their browser, not inside WhatsApp. The WhatsApp button adds this reminder for you.
        </p>
      )}
      {detail && (
        <div className="mt-4 border-t border-border pt-4">
          {detail.opens.length === 0 ? (
            <p className="text-sm text-muted">Not opened yet.</p>
          ) : (
            <ul className="text-sm text-foreground flex flex-col gap-1.5">
              {detail.opens.map((o, i) => (
                <li key={i}>{fmt(o.openedAt)} · {DEVICE_LABEL[o.device] ?? 'Other device'} · {SOURCE_LABEL[o.source] ?? 'Other'}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted mt-3">We cannot tell who opened it.</p>
        </div>
      )}
      <Modal open={stopOpen} onClose={() => setStopOpen(false)} title="Stop this link?"
        footer={
          <div className="flex gap-3 justify-end">
            <button onClick={() => setStopOpen(false)} className="px-5 py-2.5 rounded-full font-semibold text-primary">Keep it</button>
            <button onClick={stop} className="px-5 py-2.5 rounded-full font-bold bg-[#B4442F] text-white">Stop link</button>
          </div>
        }>
        <p className="text-foreground">“{link.label}” will stop working straight away. This cannot be undone, but you can make a new link any time.</p>
      </Modal>
    </div>
  );
}

function MakeLinkModal({ open, onClose, onCreated, setMessage }: { open: boolean; onClose: () => void; onCreated: () => Promise<void>; setMessage: (m: string) => void }) {
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<ExpiryKind>('one_view');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<{ id: string; path: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const close = () => { setLabel(''); setKind('one_view'); setError(''); setCreated(null); setCopied(false); onClose(); };
  const create = async () => {
    setBusy(true); setError('');
    const r = await api<{ id: string; path: string }>('POST', '/links', { label, expiryKind: kind });
    setBusy(false);
    if (r.ok) { setCreated({ id: r.data.id, path: r.data.path }); await onCreated(); }
    else setError(r.data.error || 'Could not make the link.');
  };
  const url = created && typeof window !== 'undefined' ? `${window.location.origin}${created.path}` : '';
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); } catch { setMessage('Could not copy the link.'); } };

  return (
    <Modal open={open} onClose={close} title={created ? 'Your link is ready' : 'Make a new link'}
      footer={
        <div className="flex gap-3 justify-end">
          {created ? (
            <button onClick={close} className="px-6 py-2.5 rounded-full font-bold bg-primary text-surface">Done</button>
          ) : (
            <>
              <button onClick={close} className="px-5 py-2.5 rounded-full font-semibold text-primary">Cancel</button>
              <button onClick={create} disabled={busy || !label.trim()} className="px-6 py-2.5 rounded-full font-bold bg-primary text-surface disabled:opacity-50">{busy ? 'Making…' : 'Create link'}</button>
            </>
          )}
        </div>
      }>
      {created ? (
        <div className="flex flex-col gap-4">
          <div className="border border-border rounded-xl px-4 py-3 text-primary font-semibold break-all">{url}</div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={copy} className="px-5 py-2.5 rounded-full border border-primary text-primary font-bold">{copied ? 'Copied' : 'Copy link'}</button>
            <a href={whatsappUrl({ label, expiryKind: kind }, url)} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 rounded-full bg-[#25A55A] text-white font-bold">Send on WhatsApp</a>
          </div>
          {kind === 'one_view' && (
            <p className="text-sm bg-[#FBF1D3] text-[#5B4308] rounded-xl px-4 py-3">One-time link. Tell them to open it in their browser, not inside WhatsApp. We add this reminder to the WhatsApp message for you.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div>
            <label htmlFor="link-label" className="block text-sm font-semibold text-foreground mb-1.5">Who is this link for?</label>
            <input id="link-label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} placeholder="For example: Uncle in Pune"
              className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary bg-background" />
            <p className="text-xs text-muted mt-1.5">Only you see this name. It helps you remember who has the link.</p>
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground mb-2">How long should it work?</div>
            <div className="flex flex-col gap-2.5">
              <button type="button" onClick={() => setKind('one_view')}
                className={`relative text-left rounded-2xl border-2 px-4 py-3.5 transition-colors ${kind === 'one_view' ? 'border-primary bg-[#FFF9EA]' : 'border-border bg-background'}`}>
                <span className="absolute -top-2.5 right-4 bg-[#C9A24B] text-[#3F2A16] text-[11px] font-bold px-2.5 py-0.5 rounded-full">★ Recommended</span>
                <span className="font-bold text-foreground block">One view only</span>
                <span className="text-sm text-muted">Works once. The safest way to share.</span>
              </button>
              <div className="grid grid-cols-4 gap-2">
                {(['24h', '3d', '7d', '30d'] as ExpiryKind[]).map((k) => (
                  <button key={k} type="button" onClick={() => setKind(k)}
                    className={`rounded-full border-2 py-2.5 text-sm font-semibold transition-colors ${kind === k ? 'border-primary bg-[#FFF9EA] text-foreground' : 'border-border bg-background text-muted'}`}>
                    {KIND_LABEL[k]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-[#B4442F]">{error}</p>}
        </div>
      )}
    </Modal>
  );
}

// ── What I share tab ─────────────────────────────────────────────────────────
function WhatIShareTab({ data, reload, setMessage }: { data: Overview; reload: () => Promise<void>; setMessage: (m: string) => void }) {
  const { settings, details } = data;
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [detailError, setDetailError] = useState('');

  const patch = async (body: Record<string, unknown>) => {
    const r = await api('PATCH', '/settings', body);
    if (r.ok) await reload(); else setMessage(r.data.error || 'Could not save.');
    return r;
  };
  const toggleField = (k: ShareFieldKey) => {
    const next = settings.visibleFields.includes(k) ? settings.visibleFields.filter((f) => f !== k) : [...settings.visibleFields, k];
    patch({ visibleFields: next });
  };
  const choosePhoto = (m: 'blurred' | 'own') => { if (m === 'own') { setPw(''); setPwError(''); setPwOpen(true); } else patch({ photoMode: 'blurred' }); };
  const confirmOwn = async () => {
    const r = await api('PATCH', '/settings', { photoMode: 'own', password: pw });
    if (r.ok) { setPwOpen(false); await reload(); } else setPwError(r.data.error || 'Wrong password');
  };
  const addDetail = async () => {
    setDetailError('');
    const r = await api('POST', '/details', { label, value });
    if (r.ok) { setLabel(''); setValue(''); await reload(); } else setDetailError(r.data.error || 'Could not add.');
  };
  const removeDetail = async (id: string) => { await api('DELETE', `/details/${id}`); await reload(); };

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-surface border border-border rounded-2xl px-6 py-5 flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Name and photo</h2>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="font-semibold text-foreground">Name</span>
          <Segmented value={settings.nameMode} onChange={(v) => patch({ nameMode: v })} options={[{ value: 'first', label: 'First name' }, { value: 'full', label: 'Full name' }]} />
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="font-semibold text-foreground">Photo</span>
          <Segmented value={settings.photoMode} onChange={choosePhoto} options={[{ value: 'blurred', label: 'Blurred' }, { value: 'own', label: 'My photo' }]} />
        </div>
        <p className="text-sm text-muted">The small card in a chat always uses the blurred photo, even if you choose “My photo” for the page.</p>
      </section>

      <section className="bg-surface border border-border rounded-2xl px-6 py-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted mb-4">Details to show</h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3.5">
          {SHARE_FIELD_KEYS.map((k) => (
            <div key={k} className="flex items-center justify-between gap-3">
              <span className="text-foreground">{SHARE_FIELD_LABELS[k]}</span>
              <Switch checked={settings.visibleFields.includes(k)} onChange={() => toggleField(k)} label={SHARE_FIELD_LABELS[k]} />
            </div>
          ))}
        </div>
        <p className="text-sm text-muted mt-4">Your phone number, email and ITS number are never shared.</p>
      </section>

      <section className="bg-surface border border-border rounded-2xl px-6 py-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted mb-4">Your own details</h2>
        {details.length > 0 && (
          <ul className="flex flex-col gap-2.5 mb-5">
            {details.map((d) => (
              <li key={d.id} className="flex items-start justify-between gap-3 bg-background rounded-xl px-4 py-3">
                <div><div className="text-xs font-semibold text-muted">{d.label}</div><div className="text-foreground">{d.value}</div></div>
                <button onClick={() => removeDetail(d.id)} aria-label={`Remove ${d.label}`} className="text-muted hover:text-[#B4442F]"><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2 mb-3">
          {DETAIL_SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => setLabel(s)} className="px-3 py-1.5 rounded-full bg-accent-light text-primary text-sm font-semibold">{s}</button>
          ))}
        </div>
        <div className="grid sm:grid-cols-[1fr_2fr_auto] gap-3">
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} placeholder="Title" aria-label="Title" className="px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:border-primary" />
          <input value={value} onChange={(e) => setValue(e.target.value)} maxLength={200} placeholder="Detail" aria-label="Detail" className="px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:border-primary" />
          <button onClick={addDetail} disabled={!label.trim() || !value.trim()} className="px-6 py-3 rounded-full bg-primary text-surface font-bold disabled:opacity-50">Add</button>
        </div>
        {detailError && <p className="text-sm text-[#B4442F] mt-2">{detailError}</p>}
        <div className="mt-4 flex gap-3 items-start bg-[#FBF1D3] text-[#5B4308] rounded-xl px-4 py-3 text-sm">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div><strong>Keep it private.</strong> Please do not put your phone number or email in your bio or details. Anyone with your link can read them.</div>
        </div>
      </section>

      <div className="flex justify-end">
        <Link href="/share/preview" target="_blank" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-primary text-primary font-bold bg-surface"><Eye className="w-4 h-4" /> Preview what people see</Link>
      </div>

      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Show my own photo?"
        footer={
          <div className="flex gap-3 justify-end">
            <button onClick={() => setPwOpen(false)} className="px-5 py-2.5 rounded-full font-semibold text-primary">Cancel</button>
            <button onClick={confirmOwn} disabled={!pw} className="px-6 py-2.5 rounded-full font-bold bg-primary text-surface disabled:opacity-50">Confirm</button>
          </div>
        }>
        <p className="text-foreground leading-relaxed">Anyone with one of your links will see your real photo on the page. Enter your password to confirm.</p>
        <PasswordInput value={pw} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPw(e.target.value)} placeholder="Password" />
        {pwError && <p className="text-sm text-[#B4442F]">{pwError}</p>}
      </Modal>
    </div>
  );
}

// ── Activity tab ─────────────────────────────────────────────────────────────
function ActivityTab({ data }: { data: Overview }) {
  const [days, setDays] = useState(30);
  const [activity, setActivity] = useState<Activity | null>(null);
  useEffect(() => {
    let alive = true;
    api<Activity>('GET', `/activity?days=${days}`).then((r) => { if (alive && r.ok) setActivity(r.data as Activity); });
    return () => { alive = false; };
  }, [days]);

  const max = Math.max(1, ...(activity?.series.map((s) => s.opens) ?? [1]));
  const chip = (d: number, l: string) => (
    <button key={d} onClick={() => setDays(d)} className={`px-4 py-1.5 rounded-full text-sm font-semibold ${days === d ? 'bg-primary text-surface' : 'bg-background border border-border text-muted'}`}>{l}</button>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">{chip(7, '7 days')}{chip(30, '30 days')}{chip(90, '90 days')}</div>
      <div className="grid grid-cols-3 gap-3">
        {[{ n: activity?.totalOpens ?? 0, l: 'Opens' }, { n: data.activeCount, l: 'Active links' }, { n: data.totals.joined, l: 'Joined' }].map((t) => (
          <div key={t.l} className="bg-surface border border-border rounded-2xl px-5 py-4"><div className="text-3xl font-bold text-foreground">{t.n}</div><div className="text-sm text-muted">{t.l}</div></div>
        ))}
      </div>
      <div className="bg-surface border border-border rounded-2xl px-5 py-5">
        <div className="flex items-end gap-[3px] h-28" role="img" aria-label={`Opens per day over the last ${days} days`}>
          {(activity?.series ?? []).map((s) => (
            <div key={s.day} title={`${s.day}: ${s.opens}`} className="flex-1 rounded-t bg-[#C9A24B]" style={{ height: `${Math.max(3, (s.opens / max) * 100)}%`, opacity: s.opens === 0 ? 0.25 : 1 }} />
          ))}
        </div>
        <p className="text-xs text-muted mt-3">Opens per day. We cannot tell who opened a link.</p>
      </div>
      <div className="flex flex-col gap-2.5">
        {data.links.length === 0 && <p className="text-muted">No links yet.</p>}
        {data.links.map((l) => (
          <div key={l.id} className="bg-surface border border-border rounded-2xl px-5 py-3.5 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[160px]"><div className="font-bold text-foreground">{l.label}</div><div className="text-sm text-muted">{KIND_LABEL[l.expiryKind]} · {l.opens} {l.opens === 1 ? 'open' : 'opens'}{l.joined ? ` · ${l.joined} joined` : ''}</div></div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_STYLE[l.status]}`}>{STATUS_LABEL[l.status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

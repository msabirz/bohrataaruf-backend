'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Ticket } from 'lucide-react';
import type { ProgramFormField } from '@/lib/programFormSchema';

interface Props {
  programId: string;
  slug: string;
  fields: ProgramFormField[];
  isAuthenticated: boolean;
  initialApplication: { status: string; passCode: string | null } | null;
  feeAmount: number | null;
}

const STATUS_COPY: Record<string, { label: string; body: string; tone: 'neutral' | 'good' | 'bad' }> = {
  submitted: { label: 'Application received', body: 'We\'ll notify you here and by email once selections are made.', tone: 'neutral' },
  selected: { label: 'You\'ve been selected', body: 'Look out for an email with next steps.', tone: 'good' },
  accepted: { label: 'Confirmed', body: 'Your spot is confirmed. Show your entry pass code below at check-in.', tone: 'good' },
  rejected: { label: 'Not selected this time', body: 'Thank you for applying — we hope to see you at a future program.', tone: 'bad' },
  declined: { label: 'Declined', body: 'You declined your spot for this program.', tone: 'bad' },
};

export function ProgramApplyForm({ programId, slug, fields, isAuthenticated, initialApplication, feeAmount }: Props) {
  const [application, setApplication] = useState(initialApplication);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const priceHeader = (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Entry</p>
        <p className="text-xl font-bold text-foreground">{feeAmount ? `₹${feeAmount}` : 'Free'}</p>
      </div>
      <div className="w-10 h-10 rounded-full bg-accent-light/50 flex items-center justify-center">
        <Ticket className="w-5 h-5 text-primary" />
      </div>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
        {priceHeader}
        <div className="p-6 text-center">
          <p className="text-foreground font-medium mb-4">Log in or create an account to apply.</p>
          <div className="flex flex-col gap-2.5">
            <Link href={`/?redirect=${encodeURIComponent(`/events/${slug}`)}`} className="text-sm font-medium bg-primary text-surface px-5 py-3 rounded-xl hover:bg-primary/90 transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="text-sm font-medium text-foreground hover:text-primary transition-colors px-5 py-2">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (application) {
    const copy = STATUS_COPY[application.status] ?? { label: application.status, body: '', tone: 'neutral' as const };
    const toneStyle = copy.tone === 'good'
      ? 'bg-accent-light/40 text-primary'
      : copy.tone === 'bad'
        ? 'bg-danger/10 text-danger'
        : 'bg-accent-light/30 text-foreground';
    return (
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
        {priceHeader}
        <div className="p-6">
          <div className={`flex items-center gap-2 rounded-xl px-4 py-3 mb-1 ${toneStyle}`}>
            {copy.tone === 'good' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <p className="font-bold text-sm">{copy.label}</p>
          </div>
          <p className="text-sm text-muted px-1 mt-2">{copy.body}</p>
          {application.passCode && (
            <div className="mt-4 bg-background border border-dashed border-primary/40 rounded-xl px-5 py-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Your entry pass</p>
              <p className="font-mono text-2xl font-bold text-foreground tracking-widest">{application.passCode}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const setValue = (id: string, v: string) => setValues((prev) => ({ ...prev, [id]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    for (const field of fields) {
      if (field.required && !values[field.id]?.trim()) {
        setError(`"${field.label}" is required`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/program-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programId, formResponses: values }),
      });
      const data = await res.json();
      if (res.ok) {
        setApplication({ status: data.application.status, passCode: data.application.passCode });
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
      {priceHeader}
      <div className="p-6">
        <h3 className="text-base font-bold text-foreground mb-1">Apply to attend</h3>
        <p className="text-xs text-muted mb-5">Your name and age are shared with organizers automatically from your profile.</p>

        {fields.length > 0 && (
          <div className="space-y-4 mb-5">
            {fields.map((field) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {field.label}{field.required && <span className="text-danger"> *</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={values[field.id] || ''}
                    onChange={(e) => setValue(field.id, e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-background text-foreground"
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={values[field.id] || ''}
                    onChange={(e) => setValue(field.id, e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-background text-foreground"
                  >
                    <option value="">Select an option</option>
                    {(field.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={values[field.id] || ''}
                    onChange={(e) => setValue(field.id, e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-background text-foreground"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-danger text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary text-surface font-medium px-8 py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit application'}
        </button>
      </div>
    </form>
  );
}

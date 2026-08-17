'use client';

import React, { useState } from 'react';

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await fetch('/api/marketing/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error('Failed to send message. Please try again.');
      }

      setStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message);
    }
  };

  return (
    <div className="bg-background min-h-screen pt-24 pb-32 px-6">
      <div className="container mx-auto max-w-4xl grid md:grid-cols-2 gap-16">
        
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">Contact Us</h1>
          <div className="prose prose-lg prose-p:text-muted max-w-none mb-8">
            <p className="font-semibold text-foreground text-xl">We're here if you need us.</p>
            <p>
              Questions about your account, verification, a technical issue, or just want to share feedback — reach out and a real person will respond.
            </p>
            <p className="flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              Email: <strong>support@bohrataaruf.com</strong>
            </p>
            <div className="mt-8 p-4 bg-accent-light/30 border border-accent/20 rounded-xl">
              <p className="text-sm m-0">
                For urgent account or safety concerns, mark your message <strong>"Urgent"</strong> and we'll prioritize it.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface p-8 rounded-3xl border border-border shadow-sm">
          {status === 'success' ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-accent-light text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-2xl font-bold mb-2">Message Sent</h3>
              <p className="text-muted">Thank you for reaching out. A real person from our team will get back to you shortly.</p>
              <button onClick={() => setStatus('idle')} className="mt-8 text-primary font-medium hover:underline">Send another message</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {status === 'error' && (
                <div className="p-3 bg-danger/10 text-danger rounded-xl text-sm border border-danger/20">{errorMessage}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Your Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Burhanuddin" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email Address</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none" placeholder="email@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Subject</label>
                <input required type="text" value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none" placeholder="How can we help?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Message</label>
                <textarea required rows={4} value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none resize-none" placeholder="Your message here..." />
              </div>
              <button disabled={status === 'submitting'} type="submit" className="w-full bg-primary text-surface font-bold py-4 rounded-xl mt-4 hover:bg-primary/90 transition-colors disabled:opacity-50">
                {status === 'submitting' ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}

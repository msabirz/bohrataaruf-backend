'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, ShieldAlert, ShieldQuestion, Upload } from 'lucide-react';

type Status = 'none' | 'pending' | 'verified' | 'rejected';

type VerificationStatus = {
  status: Status;
  submittedAt?: string | null;
  rejectionReason?: string | null;
};

const STATUS_COPY: Record<Status, { title: string; description: string }> = {
  verified: { title: 'Your ITS card is verified', description: 'Your identity has been confirmed. A verified badge is shown on your profile.' },
  pending: { title: 'Verification in progress', description: "We're reviewing your ITS card. This usually takes 1-2 business days." },
  rejected: { title: 'Verification was not successful', description: 'Please upload a new photo of your ITS card.' },
  none: { title: 'Not yet verified', description: 'Upload your ITS card to get a verified badge and view other profiles.' },
};

export default function VerificationPage() {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [itsNumber, setItsNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/v1/verification/status');
      const data = await res.json();
      setStatus(data);
    } catch {
      // keep whatever we had
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!/^\d{8}$/.test(itsNumber)) {
      setErrorMsg('Please enter a valid 8-digit ITS number.');
      return;
    }
    if (!file) {
      setErrorMsg('Please choose a photo of your ITS card.');
      return;
    }

    setIsUploading(true);
    try {
      // Same presigned-URL flow the mobile app uses — this backend API is
      // fully generic, no mobile-specific assumptions.
      const uploadUrlRes = await fetch('/api/v1/verification/upload-url', { method: 'POST' });
      if (!uploadUrlRes.ok) throw new Error('Could not start upload.');
      const { uploadUrl, objectKey } = await uploadUrlRes.json();

      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'image/jpeg' },
      });
      if (!putRes.ok) throw new Error('Upload failed. Please try again.');

      const confirmRes = await fetch('/api/v1/verification/its-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardImageKey: objectKey, itsNumber }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) {
        if (confirmData.error === 'DUPLICATE_ITS_NUMBER') {
          setErrorMsg(confirmData.message);
        } else {
          setErrorMsg(confirmData.message || confirmData.error || 'Something went wrong. Please try again.');
        }
        return;
      }

      setStatus(confirmData);
      setItsNumber('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: any) {
      setErrorMsg(e.message || 'Something went wrong. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const s = status?.status ?? 'none';
  const copy = STATUS_COPY[s];
  const StatusIcon = s === 'verified' ? ShieldCheck : s === 'rejected' ? ShieldAlert : ShieldQuestion;

  return (
    <div className="min-h-[calc(100vh-80px)] bg-background px-6 pt-8 pb-24">
      <div className="container mx-auto max-w-lg">
        <h1 className="text-2xl font-bold text-foreground mb-6">Verification</h1>

        <div className="bg-surface border border-border rounded-3xl p-8 flex flex-col items-center text-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center">
            <StatusIcon className="w-7 h-7 text-accent" />
          </div>
          <span className={`text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full ${
            s === 'verified' ? 'bg-green-100 text-green-800' : s === 'rejected' ? 'bg-red-100 text-red-800' : s === 'pending' ? 'bg-accent-light text-primary' : 'bg-border text-muted'
          }`}>
            {s}
          </span>
          <p className="font-bold text-foreground">{copy.title}</p>
          <p className="text-sm text-muted">{copy.description}</p>

          {s === 'rejected' && status?.rejectionReason && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 w-full text-left">
              <p className="text-sm font-semibold text-red-900 mb-1">Your submission was not approved:</p>
              <p className="text-sm text-red-800">{status.rejectionReason}</p>
            </div>
          )}

          {status?.submittedAt && (
            <div className="flex justify-between w-full pt-3 border-t border-border text-sm">
              <span className="text-muted">Submitted</span>
              <span className="text-foreground">{new Date(status.submittedAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {(s === 'none' || s === 'rejected') && (
          <div className="bg-surface border border-border rounded-3xl p-8 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">ITS Number</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={itsNumber}
                onChange={(e) => { setItsNumber(e.target.value.replace(/\D/g, '')); setErrorMsg(null); }}
                placeholder="e.g. 30412345"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">ITS Card Photo</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => { setFile(e.target.files?.[0] || null); setErrorMsg(null); }}
                className="w-full text-sm text-muted file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-accent-light file:text-primary hover:file:bg-accent-light/70"
              />
            </div>
            {errorMsg && <p className="text-sm text-danger">{errorMsg}</p>}
            <button
              onClick={handleSubmit}
              disabled={isUploading}
              className="w-full bg-primary text-surface font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {isUploading ? 'Uploading...' : s === 'rejected' ? 'Re-upload ITS card' : 'Upload ITS card'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Send, Users } from 'lucide-react';
import type { ProgramFormField } from '@/lib/programFormSchema';

interface Application {
  id: string;
  userId: string;
  formResponses: Record<string, string> | null;
  status: string;
  paymentStatus: string;
  passCode: string | null;
  selectionNotifiedAt: string | null;
  createdAt: string;
  name: string;
  email: string | null;
  city: string | null;
  gender: string | null;
  dateOfBirth: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  submitted: 'bg-gray-100 text-gray-700',
  selected: 'bg-amber-100 text-amber-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
  declined: 'bg-gray-100 text-gray-500',
};

const STATUS_OPTIONS = ['submitted', 'selected', 'rejected', 'accepted', 'declined'];

function ageFromDob(dob: string | null): string {
  if (!dob) return '—';
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)).toString();
}

export default function AdminProgramApplicationsList({ programId, fields }: { programId: string; fields: ProgramFormField[] }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [notifyResult, setNotifyResult] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/programs/${programId}/applications`);
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
      }
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const fieldLabel = (fieldId: string) => fields.find((f) => f.id === fieldId)?.label || fieldId;

  const handleStatusChange = async (appId: string, status: string) => {
    setUpdatingId(appId);
    try {
      const res = await fetch(`/api/admin/programs/${programId}/applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, ...data.application } : a)));
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingNotifyCount = applications.filter((a) => a.status === 'selected' && !a.selectionNotifiedAt).length;

  const handleNotifySelected = async () => {
    setNotifying(true);
    setNotifyResult(null);
    try {
      const res = await fetch(`/api/admin/programs/${programId}/notify-selected`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setNotifyResult(`Emailed ${data.sent} selected applicant${data.sent === 1 ? '' : 's'}${data.skippedNoEmail ? ` (${data.skippedNoEmail} had no email on file)` : ''}.`);
        fetchApplications();
      } else {
        setNotifyResult(data.error || 'Something went wrong.');
      }
    } finally {
      setNotifying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-amber-900">
          <Users className="w-4 h-4" />
          {pendingNotifyCount > 0
            ? `${pendingNotifyCount} selected applicant${pendingNotifyCount === 1 ? '' : 's'} not yet notified.`
            : 'All selected applicants have been notified.'}
        </div>
        <div className="flex items-center gap-3">
          {notifyResult && <span className="text-sm text-gray-600">{notifyResult}</span>}
          <button
            onClick={handleNotifySelected}
            disabled={notifying || pendingNotifyCount === 0}
            className="px-4 py-2 bg-[#8C6A3F] text-white rounded-lg font-medium text-sm hover:bg-[#7a5b35] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" /> {notifying ? 'Sending…' : 'Notify Selected'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Applicant</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Applied</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Notified</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Pass</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading applications...</td></tr>
              ) : applications.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No applications yet.</td></tr>
              ) : (
                applications.map((app) => (
                  <React.Fragment key={app.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{app.name}</p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {ageFromDob(app.dateOfBirth)} yrs · {app.gender || '—'} · {app.city || '—'}
                        </p>
                        {app.email && <p className="text-gray-400 text-xs">{app.email}</p>}
                      </td>
                      <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                        {new Date(app.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={app.status}
                          disabled={updatingId === app.id}
                          onChange={(e) => handleStatusChange(app.id, e.target.value)}
                          className={`text-xs font-medium capitalize rounded-full px-2.5 py-1 border-0 focus:ring-2 focus:ring-[#8C6A3F]/30 cursor-pointer ${STATUS_BADGE[app.status] || 'bg-gray-100 text-gray-700'}`}
                        >
                          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {app.status === 'selected'
                          ? (app.selectionNotifiedAt
                            ? new Date(app.selectionNotifiedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
                            : 'Not yet')
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {app.passCode ? (
                          <span className="font-mono font-medium text-gray-900 bg-gray-100 rounded px-1.5 py-0.5">{app.passCode}</span>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {fields.length > 0 && (
                          <button
                            onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                            className="text-gray-400 hover:text-gray-700 transition-colors"
                            aria-label="Toggle application answers"
                          >
                            {expandedId === app.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedId === app.id && fields.length > 0 && (
                      <tr className="bg-gray-50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="space-y-2">
                            {fields.map((field) => (
                              <div key={field.id} className="text-sm">
                                <span className="text-gray-500">{fieldLabel(field.id)}: </span>
                                <span className="text-gray-900 font-medium">{app.formResponses?.[field.id] || '—'}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

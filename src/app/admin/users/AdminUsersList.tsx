'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Filter, ShieldCheck, ShieldAlert, Shield, ShieldX, User, ChevronRight, X } from 'lucide-react';
import { buildDefaultPrelaunchMessage, buildDefaultShareInviteMessage, DEFAULT_SHARE_INVITE_SUBJECT } from '@/lib/email/defaultMessages';

interface AdminUser {
  id: string;
  name: string;
  alias: string | null;
  city: string;
  phone: string;
  email: string | null;
  isActive: boolean;
  abandonedAt: string | null;
  createdAt: string;
  verificationStatus: string | null;
  rejectionReason: string | null;
  matchCount: number;
  prelaunchAckSentAt: string | null;
  shareInviteSentAt: string | null;
  sharingEnabled: boolean | null;
  shareLinkCount: number;
  shareActiveLinks: number;
  shareOpens: number;
  completion: { percentage: number; missing: string[]; prefsFilled: number; prefsTotal: number; hasPhoto: boolean; itsSubmitted: boolean };
}

export default function AdminUsersList() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);
  const [nudgeCleaning, setNudgeCleaning] = useState(false);
  const [nudgeCleanupMessage, setNudgeCleanupMessage] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [abandonedFilter, setAbandonedFilter] = useState('');
  const [completionFilter, setCompletionFilter] = useState('');
  const [noPhoto, setNoPhoto] = useState(false);
  const [noEmail, setNoEmail] = useState(false);
  const [itsNotSubmitted, setItsNotSubmitted] = useState(false);
  const [sort, setSort] = useState('joined');
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [shareSendingId, setShareSendingId] = useState<string | null>(null);
  const [shareCompose, setShareCompose] = useState<AdminUser | null>(null);
  const [shareSubject, setShareSubject] = useState(DEFAULT_SHARE_INVITE_SUBJECT);
  const [shareMessage, setShareMessage] = useState(buildDefaultShareInviteMessage());
  const [composeUser, setComposeUser] = useState<AdminUser | null>(null);
  const [composeMessage, setComposeMessage] = useState('');

  const buildParams = useCallback((offset: number) => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (statusFilter) params.set('status', statusFilter);
    if (activeFilter) params.set('active', activeFilter);
    if (abandonedFilter) params.set('abandoned', abandonedFilter);
    if (completionFilter) params.set('completion', completionFilter);
    if (noPhoto) params.set('noPhoto', 'true');
    if (noEmail) params.set('noEmail', 'true');
    if (itsNotSubmitted) params.set('itsNotSubmitted', 'true');
    if (sort !== 'joined') params.set('sort', sort);
    if (offset > 0) params.set('offset', String(offset));
    return params;
  }, [search, statusFilter, activeFilter, abandonedFilter, completionFilter, noPhoto, noEmail, itsNotSubmitted, sort]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?${buildParams(0).toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotal(data.total ?? (data.users || []).length);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/admin/users?${buildParams(users.length).toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers((prev) => [...prev, ...(data.users || [])]);
        setTotal(data.total ?? total);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCleanupAbandoned = async () => {
    if (!confirm('Are you sure you want to run the abandoned registrations cleanup (7+ days inactive)?')) return;
    setCleaning(true);
    setCleanupMessage(null);
    try {
      const res = await fetch('/api/admin/cleanup-abandoned', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setCleanupMessage(`Successfully soft-deleted ${data.cleanedCount} abandoned account(s).`);
        fetchUsers();
      } else {
        alert(data.error || 'Cleanup failed');
      }
    } catch (e) {
      alert('Network error during cleanup');
    } finally {
      setCleaning(false);
    }
  };

  const handleCleanupExpiredNudges = async () => {
    if (!confirm('Are you sure you want to delete Nearby Nudge message history older than 30 days? Thread records are kept, only the message content is removed.')) return;
    setNudgeCleaning(true);
    setNudgeCleanupMessage(null);
    try {
      const res = await fetch('/api/admin/cleanup-expired-nudges', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setNudgeCleanupMessage(`Successfully deleted ${data.deletedMessageCount} expired nudge message(s).`);
      } else {
        alert(data.error || 'Cleanup failed');
      }
    } catch (e) {
      alert('Network error during cleanup');
    } finally {
      setNudgeCleaning(false);
    }
  };

  const openComposePrelaunchAck = (user: AdminUser, e: React.MouseEvent) => {
    e.stopPropagation(); // don't trigger the row's navigate-to-detail click
    setComposeUser(user);
    setComposeMessage(buildDefaultPrelaunchMessage(user.verificationStatus === 'rejected', user.rejectionReason ?? undefined));
  };

  const handleConfirmSendPrelaunchAck = async () => {
    if (!composeUser) return;
    const user = composeUser;
    setSendingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sent_prelaunch_ack_email', message: composeMessage }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setComposeUser(null);
        fetchUsers();
      } else {
        alert(data.error || 'Failed to send email');
      }
    } catch (e) {
      alert('Network error sending email');
    } finally {
      setSendingId(null);
    }
  };

  const openShareCompose = (user: AdminUser, e: React.MouseEvent) => {
    e.stopPropagation(); // don't trigger the row's navigate-to-detail click
    setShareCompose(user);
    setShareSubject(DEFAULT_SHARE_INVITE_SUBJECT);
    setShareMessage(buildDefaultShareInviteMessage());
  };

  const handleConfirmSendShare = async () => {
    if (!shareCompose) return;
    const user = shareCompose;
    setShareSendingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/share-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: shareSubject, message: shareMessage }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShareCompose(null);
        fetchUsers();
      } else {
        alert(data.error || 'Failed to send email');
      }
    } catch {
      alert('Network error sending email');
    } finally {
      setShareSendingId(null);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'verified': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><ShieldCheck className="w-3 h-3" /> Verified</span>;
      case 'pending': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><ShieldAlert className="w-3 h-3" /> Pending</span>;
      case 'rejected': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><ShieldX className="w-3 h-3" /> Rejected</span>;
      default: return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><Shield className="w-3 h-3" /> None</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">User Management</h1>
          <p className="text-gray-500 mt-2">Search, view, and manage volunteer actions on user accounts.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCleanupAbandoned}
            disabled={cleaning}
            className="px-4 py-2 bg-[#8C6A3F] text-white rounded-lg font-medium text-sm hover:bg-[#7a5b35] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {cleaning ? 'Running Cleanup...' : 'Cleanup Abandoned Registrations'}
          </button>
          <button
            onClick={handleCleanupExpiredNudges}
            disabled={nudgeCleaning}
            className="px-4 py-2 bg-[#8C6A3F] text-white rounded-lg font-medium text-sm hover:bg-[#7a5b35] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {nudgeCleaning ? 'Running Cleanup...' : 'Cleanup Expired Nudge Messages'}
          </button>
        </div>
      </div>

      {cleanupMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm flex justify-between items-center">
          <span>{cleanupMessage}</span>
          <button onClick={() => setCleanupMessage(null)} className="text-green-600 hover:text-green-800 font-bold">✕</button>
        </div>
      )}

      {nudgeCleanupMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm flex justify-between items-center">
          <span>{nudgeCleanupMessage}</span>
          <button onClick={() => setNudgeCleanupMessage(null)} className="text-green-600 hover:text-green-800 font-bold">✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Search by name, alias, city, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#8C6A3F] focus:border-[#8C6A3F] transition-all"
          />
        </div>
        
        <div className="flex gap-4 w-full md:w-auto shrink-0 flex-wrap">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#8C6A3F] bg-white text-sm"
          >
            <option value="">All Verification Status</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>

          <select 
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#8C6A3F] bg-white text-sm"
          >
            <option value="">All Account Status</option>
            <option value="true">Active</option>
            <option value="false">Suspended</option>
          </select>

          <select 
            value={abandonedFilter}
            onChange={(e) => setAbandonedFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#8C6A3F] bg-white text-sm"
          >
            <option value="">All Registrations</option>
            <option value="true">Abandoned Only</option>
          </select>

          <select
            value={completionFilter}
            onChange={(e) => setCompletionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#8C6A3F] bg-white text-sm"
            aria-label="Profile completion"
          >
            <option value="">All Profile Completion</option>
            <option value="lt50">Below 50%</option>
            <option value="lt100">Below 100%</option>
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#8C6A3F] bg-white text-sm"
            aria-label="Sort"
          >
            <option value="joined">Newest first</option>
            <option value="completion_asc">Profile % low to high</option>
            <option value="completion_desc">Profile % high to low</option>
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={noPhoto} onChange={(e) => setNoPhoto(e.target.checked)} className="accent-[#8C6A3F]" /> No photo</label>
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={noEmail} onChange={(e) => setNoEmail(e.target.checked)} className="accent-[#8C6A3F]" /> No email</label>
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={itsNotSubmitted} onChange={(e) => setItsNotSubmitted(e.target.checked)} className="accent-[#8C6A3F]" /> ITS not submitted</label>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">User / Alias</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">City</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Verification</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Profile</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Matches</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Joined</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Pre-launch email</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Share link</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-500">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-lg font-medium text-gray-900">No users found</p>
                    <p>Try adjusting your search or filters.</p>
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => window.location.href = `/admin/users/${user.id}`}>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{user.name}</p>
                      <p className="text-gray-500 text-xs">{user.alias || 'No alias'}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{user.city}</td>
                    <td className="px-6 py-4">{getStatusBadge(user.verificationStatus)}</td>
                    <td className="px-6 py-4" title={user.completion.missing.length ? `Missing: ${user.completion.missing.join(', ')}` : 'Profile complete'}>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div className={`h-2 rounded-full ${user.completion.percentage >= 80 ? 'bg-green-500' : user.completion.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${user.completion.percentage}%` }} />
                        </div>
                        <span className="font-semibold text-gray-900 text-xs w-9">{user.completion.percentage}%</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Photo {user.completion.hasPhoto ? 'yes' : 'no'} · Prefs {user.completion.prefsFilled}/{user.completion.prefsTotal}</p>
                    </td>
                    <td className="px-6 py-4">
                      {user.abandonedAt ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">Abandoned</span>
                      ) : user.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">Active</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">Suspended</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{user.matchCount}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      {!user.email ? (
                        <span className="text-xs text-gray-400 italic">No email</span>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          {user.prelaunchAckSentAt && (
                            <span className="text-xs text-green-700">Sent {new Date(user.prelaunchAckSentAt).toLocaleDateString()}</span>
                          )}
                          <button
                            onClick={(e) => openComposePrelaunchAck(user, e)}
                            disabled={sendingId === user.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#8C6A3F] text-[#8C6A3F] hover:bg-[#8C6A3F] hover:text-white transition-colors disabled:opacity-50"
                          >
                            {sendingId === user.id ? 'Sending...' : user.prelaunchAckSentAt ? 'Resend' : 'Send update'}
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {!user.email ? (
                        <span className="text-xs text-gray-400 italic">No email</span>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          <span className={`text-xs ${user.sharingEnabled === false ? 'text-red-700' : user.shareActiveLinks > 0 ? 'text-green-700' : 'text-gray-500'}`}>
                            {user.sharingEnabled === false
                              ? 'Sharing switched off'
                              : user.shareActiveLinks > 0
                                ? `${user.shareActiveLinks} active, ${user.shareOpens} opens`
                                : user.shareLinkCount > 0
                                  ? `${user.shareLinkCount} links made, none active`
                                  : user.shareInviteSentAt
                                    ? `Sent ${new Date(user.shareInviteSentAt).toLocaleDateString()}`
                                    : 'Not sent yet'}
                          </span>
                          <button
                            onClick={(e) => openShareCompose(user, e)}
                            disabled={shareSendingId === user.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#8C6A3F] text-[#8C6A3F] hover:bg-[#8C6A3F] hover:text-white transition-colors disabled:opacity-50"
                          >
                            {shareSendingId === user.id ? 'Sending...' : user.shareInviteSentAt ? 'Send again' : 'Send share link'}
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#8C6A3F] inline-block" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-sm text-gray-600">
          <span>Showing {users.length} of {total} users</span>
          {users.length < total && (
            <button onClick={loadMore} disabled={loadingMore} className="px-4 py-1.5 rounded-lg border border-[#8C6A3F] text-[#8C6A3F] text-xs font-medium hover:bg-[#8C6A3F] hover:text-white transition-colors disabled:opacity-50">
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      </div>

      {composeUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  {composeUser.prelaunchAckSentAt ? 'Re-send' : 'Send'} pre-launch update to {composeUser.name}
                </h2>
                <p className="text-sm text-gray-500">{composeUser.email}</p>
              </div>
              <button
                onClick={() => setComposeUser(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {composeUser.verificationStatus === 'rejected' && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
                  This user&apos;s ITS verification is currently rejected, so the request to
                  re-upload their ITS card (with their rejection reason) is already included
                  in the message below — a &quot;Re-upload ITS card&quot; button linking to
                  their verification page is added automatically underneath it.
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Message (fully editable — this is the entire body they&apos;ll see, right
                  after &quot;Assalamu Alaikum {composeUser.name},&quot;)
                </label>
                <textarea
                  value={composeMessage}
                  onChange={(e) => setComposeMessage(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#8C6A3F] focus:border-[#8C6A3F] transition-all text-sm resize-y"
                />
              </div>
            </div>

            <div className="p-4 bg-white border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setComposeUser(null)}
                disabled={sendingId === composeUser.id}
                className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSendPrelaunchAck}
                disabled={sendingId === composeUser.id || !composeMessage.trim()}
                className="px-5 py-2.5 rounded-lg bg-[#8C6A3F] hover:bg-[#7a5b35] text-white font-semibold transition-colors disabled:opacity-50"
              >
                {sendingId === composeUser.id ? 'Sending...' : composeUser.prelaunchAckSentAt ? 'Re-send' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {shareCompose && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  {shareCompose.shareInviteSentAt ? 'Send again' : 'Send'} &quot;{shareSubject || DEFAULT_SHARE_INVITE_SUBJECT}&quot; to {shareCompose.name}
                </h2>
                <p className="text-sm text-gray-500">{shareCompose.email} · one email, counts towards your monthly email quota</p>
              </div>
              <button onClick={() => setShareCompose(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-2" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 overflow-y-auto">
              <div className="p-6 space-y-4 md:border-r border-gray-100">
                <div>
                  <label htmlFor="share-subject" className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                  <div className="flex border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#8C6A3F]">
                    <span className="bg-gray-100 px-3 py-2.5 text-sm text-gray-500 border-r border-gray-300 shrink-0">Bohra Taaruf:</span>
                    <input id="share-subject" value={shareSubject} onChange={(e) => setShareSubject(e.target.value)} maxLength={100} className="flex-1 px-3 py-2.5 text-sm outline-none min-w-0" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="share-message" className="text-sm font-medium text-gray-700">Message (right after &quot;Assalamu Alaikum {shareCompose.name},&quot;)</label>
                    <button
                      type="button"
                      onClick={() => { setShareSubject(DEFAULT_SHARE_INVITE_SUBJECT); setShareMessage(buildDefaultShareInviteMessage()); }}
                      className="text-[#8C6A3F] text-sm font-semibold hover:underline"
                    >
                      Reset to default
                    </button>
                  </div>
                  <textarea
                    id="share-message"
                    value={shareMessage}
                    onChange={(e) => setShareMessage(e.target.value)}
                    rows={9}
                    maxLength={2000}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#8C6A3F] focus:border-[#8C6A3F] transition-all text-sm leading-relaxed resize-y"
                  />
                  <p className="text-xs text-gray-500 mt-1">A blank line starts a new paragraph.</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs leading-relaxed text-gray-600">
                  <p className="font-bold text-gray-700 mb-1">Always included (not editable)</p>
                  Header with the logo and &quot;Your Profile. Your Taaruf.&quot; · greeting with their name · the three steps · the two buttons (&quot;See how it works&quot;, &quot;Share now&quot;) · two short safety lines · the reply invitation · the Instagram line. The old-way-vs-new-way picture and the full safety list are on the web page.
                </div>
              </div>

              <div className="p-6 bg-[#F8F5F0]">
                <p className="text-sm font-medium text-gray-700 mb-2">Preview (updates as you type)</p>
                <div className="bg-[#FFFFFC] border border-[#E5E0D8] rounded-xl overflow-hidden text-[13px] leading-relaxed" style={{ fontFamily: 'Georgia, serif', color: '#222' }}>
                  <div className="bg-[#3F2A16] px-4 py-3 flex items-center">
                    <div className="w-[72px]"><img src="/email/logo.png" alt="" className="w-7 h-auto" /><div className="text-white text-[11px] mt-1">Bohra Taaruf</div></div>
                    <div className="flex-1 text-center text-white text-xl leading-tight">Your Profile.<br />Your Taaruf.</div>
                    <div className="w-[72px]" />
                  </div>
                  <div className="px-5 py-4 space-y-2.5">
                    <div className="text-[10px] tracking-[0.18em] uppercase text-[#8C6A3F] font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>Bohra Taaruf brings you something new</div>
                    <div>Assalamu Alaikum {shareCompose.name},</div>
                    {(shareMessage.trim() ? shareMessage : buildDefaultShareInviteMessage()).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                    <div className="text-[12px] text-gray-600">1. Select details to share · 2. Create a link and send it · 3. Watch your analytics</div>
                    <div className="flex gap-2 justify-center pt-1">
                      <span className="bg-[#8C6A3F] text-white px-4 py-2 rounded-full">See how it works</span>
                      <span className="border border-[#8C6A3F] text-[#8C6A3F] px-4 py-[7px] rounded-full">Share now</span>
                    </div>
                    <div className="text-[11px] text-center text-gray-500">&quot;Share now&quot; asks you to log in first, then opens your share settings.</div>
                    <div className="text-[12px] bg-[#FBF1D3] text-[#5B4308] rounded-lg px-3 py-2">Always trust links that start with bohrataaruf.com. Bohra Taaruf is always free and never charges money for any feature.</div>
                    <div className="text-[12px]">Have a question? Just reply to this email and we will help.</div>
                    <div className="text-[11px] text-gray-500 border-t border-gray-200 pt-2">Bohra Taaruf is awaiting Raza Mubarak. Follow us on Instagram: @bohrataaruf</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-gray-500 max-w-md">If the email provider rejects it (for example the monthly quota is used up), you will see an error and it is not marked as sent.</span>
              <div className="flex gap-3">
                <button
                  onClick={() => setShareCompose(null)}
                  disabled={shareSendingId === shareCompose.id}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSendShare}
                  disabled={shareSendingId === shareCompose.id || shareSubject.trim().length < 3}
                  className="px-5 py-2.5 rounded-lg bg-[#8C6A3F] hover:bg-[#7a5b35] text-white font-semibold transition-colors disabled:opacity-50"
                >
                  {shareSendingId === shareCompose.id ? 'Sending...' : 'Send email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

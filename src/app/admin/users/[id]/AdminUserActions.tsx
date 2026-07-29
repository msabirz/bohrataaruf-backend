'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, CheckCircle, Trash2 } from 'lucide-react';

interface AdminUserActionsProps {
  userId: string;
  isActive: boolean;
}

export default function AdminUserActions({ userId, isActive }: AdminUserActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [showSuspend, setShowSuspend] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  
  const [showDelete, setShowDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleAction = async (action: 'suspended' | 'reactivated' | 'deleted', reason?: string) => {
    if (action === 'reactivated' && !window.confirm('Are you sure you want to reactivate this account?')) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      if (res.ok) {
        if (action === 'deleted') {
          router.push('/admin/users');
        } else {
          setShowSuspend(false);
          setSuspendReason('');
          router.refresh();
        }
      } else {
        alert('Action failed. Check console.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900">Manage Account</h3>
      </div>
      
      <div className="p-6 space-y-4">
        {/* Suspend / Reactivate */}
        {isActive ? (
          <div>
            {!showSuspend ? (
              <button
                onClick={() => setShowSuspend(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-orange-50 text-orange-700 hover:bg-orange-100 font-medium rounded-lg transition-colors"
              >
                <Ban className="w-4 h-4" /> Suspend Account
              </button>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-orange-900">Suspend this account?</p>
                <input
                  type="text"
                  placeholder="Reason (optional, for internal logs)"
                  value={suspendReason}
                  onChange={e => setSuspendReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded border border-orange-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSuspend(false)}
                    className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAction('suspended', suspendReason)}
                    disabled={loading}
                    className="flex-1 py-2 bg-orange-600 text-white rounded text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
                  >
                    {loading ? 'Wait...' : 'Confirm Suspend'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => handleAction('reactivated')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-green-50 text-green-700 hover:bg-green-100 font-medium rounded-lg transition-colors"
          >
            <CheckCircle className="w-4 h-4" /> Reactivate Account
          </button>
        )}

        {/* Delete */}
        <div className="pt-4 border-t border-gray-100">
          {!showDelete ? (
            <button
              onClick={() => setShowDelete(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-50 text-red-700 hover:bg-red-100 font-medium rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Delete Account
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-bold text-red-900">DANGER: Permanent Deletion</p>
              <p className="text-xs text-red-700 mb-2">This permanently destroys the profile, preferences, photos, and matches. It cannot be undone.</p>
              
              <input
                type="text"
                placeholder="Reason (optional, for internal logs)"
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded border border-red-200 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              
              <div>
                <label className="block text-xs text-red-900 mb-1 font-medium">Type <span className="font-mono bg-red-100 px-1">DELETE</span> to confirm</label>
                <input
                  type="text"
                  placeholder="DELETE"
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded border border-red-200 focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowDelete(false)}
                  className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction('deleted', deleteReason)}
                  disabled={loading || deleteConfirmText !== 'DELETE'}
                  className="flex-1 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Wait...' : 'Obliterate'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

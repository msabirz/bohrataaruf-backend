'use client';

import React, { useState } from 'react';
import { approveVerification, rejectVerification } from './actions';

type VerificationItem = {
  id: string;
  alias: string | null;
  city: string | null;
  createdAt: Date | null;
  imageUrl: string;
};

export default function ClientList({ items }: { items: VerificationItem[] }) {
  const [selectedItem, setSelectedItem] = useState<VerificationItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    if (!selectedItem) return;
    setLoading(true);
    try {
      await approveVerification(selectedItem.id);
      setSelectedItem(null);
    } catch (e: any) {
      alert(e.message || 'Failed to approve');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedItem) return;
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }
    setLoading(true);
    try {
      await rejectVerification(selectedItem.id, rejectReason);
      setSelectedItem(null);
      setIsRejecting(false);
      setRejectReason('');
    } catch (e: any) {
      alert(e.message || 'Failed to reject');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <div 
            key={item.id} 
            onClick={() => { setSelectedItem(item); setIsRejecting(false); setRejectReason(''); }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
          >
            <div className="h-48 w-full bg-gray-100 relative overflow-hidden flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={item.imageUrl || 'https://placehold.co/400x300/eee/999?text=Image+Missing'} 
                alt="ITS Card" 
                onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x300/eee/999?text=Image+Missing'; }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
              />
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-lg text-gray-900">{item.alias || 'Unknown'}</h3>
              <p className="text-gray-500 text-sm mb-2">{item.city || 'No city provided'}</p>
              <p className="text-xs text-gray-400">
                Submitted: {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US') : 'Unknown'}
              </p>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200 border-dashed">
            No pending verifications to review. Great job!
          </div>
        )}
      </div>

      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Review: {selectedItem.alias}</h2>
                <p className="text-sm text-gray-500">{selectedItem.city}</p>
              </div>
              <button 
                onClick={() => setSelectedItem(null)} 
                className="text-gray-400 hover:text-gray-600 transition-colors p-2"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-auto bg-gray-900 flex items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={selectedItem.imageUrl || 'https://placehold.co/600x400/eee/999?text=Image+Missing'} 
                alt="Full ITS Card" 
                onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x400/eee/999?text=Image+Missing'; }}
                className="max-w-full max-h-[60vh] object-contain rounded-md" 
              />
            </div>

            <div className="p-6 bg-white border-t border-gray-100">
              {isRejecting ? (
                <div className="space-y-4 animate-in slide-in-from-bottom-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason for Rejection
                    </label>
                    <textarea 
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="e.g. Photo is too blurry to read, or name doesn't match."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none h-24"
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button 
                      disabled={loading}
                      onClick={() => setIsRejecting(false)} 
                      className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel Rejection
                    </button>
                    <button 
                      disabled={loading}
                      onClick={handleReject} 
                      className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading ? 'Rejecting...' : 'Confirm Reject'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <button 
                    disabled={loading}
                    onClick={() => setSelectedItem(null)} 
                    className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Skip (Not my review)
                  </button>
                  <div className="flex gap-3">
                    <button 
                      disabled={loading}
                      onClick={() => setIsRejecting(true)} 
                      className="px-5 py-2.5 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 font-medium transition-colors disabled:opacity-50"
                    >
                      Reject...
                    </button>
                    <button 
                      disabled={loading}
                      onClick={handleApprove} 
                      className="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading ? 'Approving...' : '✓ Approve'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}

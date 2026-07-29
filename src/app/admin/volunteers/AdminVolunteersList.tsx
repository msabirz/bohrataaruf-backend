'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, UserCheck, Activity, Power, PowerOff } from 'lucide-react';

interface AdminVolunteer {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  verifiedCount: number;
  rejectedCount: number;
  lastActive: string | null;
}

export default function AdminVolunteersList({ currentVolunteerId }: { currentVolunteerId: string }) {
  const [volunteers, setVolunteers] = useState<AdminVolunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const fetchVolunteers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/volunteers');
      if (res.ok) {
        const data = await res.json();
        setVolunteers(data.volunteers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVolunteers();
  }, [fetchVolunteers]);

  const handleAction = async (id: string, currentActive: boolean) => {
    const isSelf = id === currentVolunteerId;
    if (isSelf && currentActive) {
      alert("You cannot deactivate your own account.");
      return;
    }

    const action = currentActive ? 'deactivate' : 'reactivate';
    const actionLabel = currentActive ? 'deactivate' : 'reactivate';
    
    if (!window.confirm(`Are you sure you want to ${actionLabel} this volunteer?`)) {
      return;
    }

    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/volunteers/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      const data = await res.json();
      if (res.ok) {
        setVolunteers(prev => prev.map(v => v.id === id ? { ...v, active: data.active } : v));
      } else {
        alert(data.error || `Failed to ${actionLabel} volunteer`);
      }
    } catch (e) {
      console.error(e);
      alert('Network error occurred.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Volunteer Team</h1>
          <p className="text-gray-500 mt-2">Manage admin access and view verification activity for all volunteers.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Volunteer Name</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Verifications Processed</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Last Active</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Joined</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading volunteers...</td>
                </tr>
              ) : volunteers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-lg font-medium text-gray-900">No volunteers found</p>
                  </td>
                </tr>
              ) : (
                volunteers.map(volunteer => {
                  const isSelf = volunteer.id === currentVolunteerId;
                  
                  return (
                    <tr key={volunteer.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{volunteer.name}</span>
                          {isSelf && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#8C6A3F]/10 text-[#8C6A3F] uppercase tracking-wider">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {volunteer.active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">Active</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Deactivated</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4 text-xs font-medium">
                          <span className="text-green-600 bg-green-50 px-2 py-1 rounded-md flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> {volunteer.verifiedCount} Approved
                          </span>
                          <span className="text-red-600 bg-red-50 px-2 py-1 rounded-md flex items-center gap-1">
                            <ShieldX className="w-3 h-3" /> {volunteer.rejectedCount} Rejected
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {volunteer.lastActive ? new Date(volunteer.lastActive).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(volunteer.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleAction(volunteer.id, volunteer.active)}
                          disabled={actionLoading === volunteer.id || (isSelf && volunteer.active)}
                          className={`
                            inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                            ${actionLoading === volunteer.id ? 'opacity-50 cursor-not-allowed' : ''}
                            ${volunteer.active 
                              ? isSelf 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                : 'bg-white border border-red-200 text-red-600 hover:bg-red-50' 
                              : 'bg-[#8C6A3F] text-white hover:bg-[#7a5c37]'
                            }
                          `}
                        >
                          {volunteer.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          {volunteer.active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Filter, ShieldCheck, ShieldAlert, Shield, ShieldX, User, ChevronRight } from 'lucide-react';

interface AdminUser {
  id: string;
  name: string;
  alias: string | null;
  city: string;
  phone: string;
  isActive: boolean;
  abandonedAt: string | null;
  createdAt: string;
  verificationStatus: string | null;
  matchCount: number;
}

export default function AdminUsersList() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [abandonedFilter, setAbandonedFilter] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (statusFilter) params.set('status', statusFilter);
    if (activeFilter) params.set('active', activeFilter);
    if (abandonedFilter) params.set('abandoned', abandonedFilter);

    try {
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, activeFilter, abandonedFilter]);

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
        <button
          onClick={handleCleanupAbandoned}
          disabled={cleaning}
          className="px-4 py-2 bg-[#8C6A3F] text-white rounded-lg font-medium text-sm hover:bg-[#7a5b35] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
        >
          {cleaning ? 'Running Cleanup...' : 'Cleanup Abandoned Registrations'}
        </button>
      </div>

      {cleanupMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm flex justify-between items-center">
          <span>{cleanupMessage}</span>
          <button onClick={() => setCleanupMessage(null)} className="text-green-600 hover:text-green-800 font-bold">✕</button>
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
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Matches</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Joined</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
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
                    <td className="px-6 py-4 text-right">
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#8C6A3F] inline-block" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

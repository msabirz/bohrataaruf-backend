'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Flag, Search, ChevronLeft, AlertTriangle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface ReportUser {
  id: string;
  phone: string;
  alias: string | null;
}

interface Report {
  id: string;
  reason: string;
  details: string | null;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  createdAt: string;
  reviewedAt: string | null;
  reporter: ReportUser;
  reportedUser: ReportUser;
  reviewedBy: { name: string } | null;
  totalReportsForUser: number;
}

export default function AdminReportsClient() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [statusFilter, setStatusFilter] = useState('pending');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);

    try {
      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedReport) return;
    try {
      const res = await fetch(`/api/admin/reports/${selectedReport.id}/action`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', status: newStatus })
      });
      const data = await res.json();
      if (res.ok) {
        setReports(prev => prev.map(r => r.id === selectedReport.id ? { ...r, status: data.status as any, reviewedBy: { name: 'You' } } : r));
        setSelectedReport(prev => prev ? { ...prev, status: data.status as any, reviewedBy: { name: 'You' } } : null);
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch (e) {
      console.error(e);
      alert('Network error');
    }
  };

  const formatReason = (reason: string) => {
    return reason.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><Flag className="w-3 h-3" /> Pending</span>;
      case 'reviewed': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Reviewed</span>;
      case 'actioned': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Actioned</span>;
      case 'dismissed': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Dismissed</span>;
      default: return null;
    }
  };

  if (selectedReport) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setSelectedReport(null)}
          className="text-gray-500 hover:text-gray-900 flex items-center gap-2 font-medium"
        >
          <ChevronLeft className="w-5 h-5" /> Back to reports
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{formatReason(selectedReport.reason)}</h1>
                {getStatusBadge(selectedReport.status)}
              </div>
              <div className="flex flex-col gap-1 text-sm text-gray-600">
                <p><span className="font-medium text-gray-900">Reported User:</span> {selectedReport.reportedUser.alias || 'Unknown'} ({selectedReport.reportedUser.phone})</p>
                <p><span className="font-medium text-gray-900">Total Reports on User:</span> <span className="text-red-600 font-bold">{selectedReport.totalReportsForUser}</span></p>
                <p><span className="font-medium text-gray-900">Submitted By:</span> {selectedReport.reporter.alias || 'Unknown'} ({selectedReport.reporter.phone})</p>
                <p><span className="font-medium text-gray-900">Date:</span> {new Date(selectedReport.createdAt).toLocaleString()}</p>
                {selectedReport.reviewedBy && (
                  <p><span className="font-medium text-gray-900">Reviewed By:</span> {selectedReport.reviewedBy.name}</p>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-3 min-w-[200px]">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Status</label>
                <select 
                  value={selectedReport.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500 bg-white text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="actioned">Actioned</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>
              <Link 
                href={`/admin/users/${selectedReport.reportedUser.id}`}
                className="inline-flex justify-center items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Manage User Account
              </Link>
            </div>
          </div>

          <hr className="border-gray-100 mb-8" />
          
          <div className="prose max-w-none">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Details</h3>
            <div className="bg-gray-50 p-6 rounded-lg text-gray-800 whitespace-pre-wrap font-sans text-sm border border-gray-100 min-h-[100px]">
              {selectedReport.details ? selectedReport.details : <span className="text-gray-400 italic">No additional details provided by the reporter.</span>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">User Reports</h1>
          <p className="text-gray-500 mt-2">Review flags and manage reported users.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex gap-4 w-full md:w-auto shrink-0">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500 bg-white text-sm"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="actioned">Actioned</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Reported User</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Reason</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loading reports...</td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <Flag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-lg font-medium text-gray-900">No reports found</p>
                  </td>
                </tr>
              ) : (
                reports.map(report => (
                  <tr 
                    key={report.id} 
                    onClick={() => setSelectedReport(report)}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${report.status === 'pending' ? 'bg-red-50/30' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {report.status === 'pending' && <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />}
                        <div>
                          <p className={`text-gray-900 ${report.status === 'pending' ? 'font-bold' : 'font-medium'} flex items-center gap-2`}>
                            {report.reportedUser.alias || 'Unknown'}
                            {Number(report.totalReportsForUser) > 1 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                                {report.totalReportsForUser} Reports
                              </span>
                            )}
                          </p>
                          <p className="text-gray-500 text-xs">{report.reportedUser.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-gray-800 ${report.status === 'pending' ? 'font-bold' : ''}`}>
                      {formatReason(report.reason)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(report.status)}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {new Date(report.createdAt).toLocaleDateString()}
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

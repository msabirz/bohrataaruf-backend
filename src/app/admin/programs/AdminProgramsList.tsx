'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, Plus } from 'lucide-react';

interface AdminProgram {
  id: string;
  title: string;
  city: string;
  startDate: string;
  endDate: string | null;
  status: string;
  featureOnHomepage: boolean;
  createdAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  published: 'bg-green-100 text-green-800',
  closed: 'bg-amber-100 text-amber-800',
  completed: 'bg-blue-100 text-blue-800',
};

export default function AdminProgramsList() {
  const router = useRouter();
  const [programs, setPrograms] = useState<AdminProgram[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/programs');
      if (res.ok) {
        const data = await res.json();
        setPrograms(data.programs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

  const formatDateRange = (start: string, end: string | null) => {
    const startD = new Date(start).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!end || end === start) return startD;
    const endD = new Date(end).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    return `${startD} – ${endD}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Taaruf Programs</h1>
          <p className="text-gray-500 mt-2">Community-organized in-person matchmaking events.</p>
        </div>
        <button
          onClick={() => router.push('/admin/programs/new')}
          className="px-4 py-2 bg-[#8C6A3F] text-white rounded-lg font-medium text-sm hover:bg-[#7a5b35] transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Program
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Program</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Dates</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Featured</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading programs...</td></tr>
              ) : programs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-lg font-medium text-gray-900">No programs yet</p>
                    <p>Create the first Taaruf Program to get started.</p>
                  </td>
                </tr>
              ) : (
                programs.map(program => (
                  <tr
                    key={program.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/admin/programs/${program.id}`)}
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{program.title}</p>
                      <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {program.city}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{formatDateRange(program.startDate, program.endDate)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[program.status] || 'bg-gray-100 text-gray-700'}`}>
                        {program.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {program.featureOnHomepage ? (
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">On Homepage</span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400">→</td>
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

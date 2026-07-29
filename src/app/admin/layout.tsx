import React from 'react';
import { getAdminSession } from '@/lib/adminAuth';
import AdminSidebar from '@/components/admin/AdminSidebar';

const APP_NAME = process.env.APP_DISPLAY_NAME ?? 'Bohra Taaruf';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
        <main className="flex-1 flex flex-col w-full mx-auto">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      <AdminSidebar session={session} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center shadow-sm shrink-0">
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">{APP_NAME} <span className="text-gray-400 font-medium mx-1">|</span> Volunteer Portal</h1>
        </header>
        <main className="flex-1 max-w-6xl w-full mx-auto p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

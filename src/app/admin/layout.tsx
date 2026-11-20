import React from 'react';
import { getAdminSession } from '@/lib/adminAuth';
import AdminShell from '@/components/admin/AdminShell';

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
    <AdminShell session={session} appName={APP_NAME}>
      {children}
    </AdminShell>
  );
}

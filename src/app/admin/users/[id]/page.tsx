import React from 'react';
import { db } from '@/lib/db';
import { users, profiles, verifications, adminActionLog, volunteers } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAdminAuth } from '@/lib/adminAuth';
import Link from 'next/link';
import { ArrowLeft, User, ShieldCheck, MapPin, Phone, Calendar, Heart, ShieldAlert, ShieldX, Shield } from 'lucide-react';
import AdminUserActions from './AdminUserActions';
import { notFound } from 'next/navigation';

export default async function AdminUserDetailPage(props: { params: Promise<{ id: string }> }) {
  await requireAdminAuth();
  const params = await props.params;
  const targetId = params.id;

  const user = await db.select().from(users).where(eq(users.id, targetId)).limit(1).then(r => r[0]);
  if (!user) return notFound();

  const profile = await db.select().from(profiles).where(eq(profiles.userId, targetId)).limit(1).then(r => r[0]);
  const verification = await db.select().from(verifications).where(eq(verifications.userId, targetId)).limit(1).then(r => r[0]);
  
  const auditLogs = await db
    .select({
      id: adminActionLog.id,
      action: adminActionLog.action,
      reason: adminActionLog.reason,
      createdAt: adminActionLog.createdAt,
      volunteerName: volunteers.name,
    })
    .from(adminActionLog)
    .leftJoin(volunteers, eq(adminActionLog.volunteerId, volunteers.id))
    .where(eq(adminActionLog.targetUserId, targetId))
    .orderBy(desc(adminActionLog.createdAt));

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'verified': return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"><ShieldCheck className="w-4 h-4" /> Verified</span>;
      case 'pending': return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800"><ShieldAlert className="w-4 h-4" /> Pending</span>;
      case 'rejected': return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"><ShieldX className="w-4 h-4" /> Rejected</span>;
      default: return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"><Shield className="w-4 h-4" /> None</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Link href="/admin/users" className="text-sm font-medium text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              {user.name} 
              {!user.isActive && <span className="bg-red-100 text-red-800 text-sm px-2.5 py-0.5 rounded-full font-medium">Suspended</span>}
            </h1>
            <p className="text-gray-500 mt-1 flex items-center gap-4">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {user.city}</span>
              <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {user.phone}</span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Joined {new Date(user.createdAt!).toLocaleDateString()}</span>
            </p>
          </div>
          <div>
            {getStatusBadge(verification?.status || null)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900">Profile Details</h3>
            </div>
            <div className="p-6 grid grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Alias</p>
                <p className="font-medium text-gray-900">{profile?.alias || 'Not set'}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Gender</p>
                <p className="font-medium text-gray-900 capitalize">{user.gender || 'Not set'}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Date of Birth</p>
                <p className="font-medium text-gray-900">{user.dateOfBirth}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Jamaat</p>
                <p className="font-medium text-gray-900">{user.jamaat || 'Not set'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500 mb-1">Education</p>
                <p className="font-medium text-gray-900">{profile?.education || 'Not set'} {profile?.fieldOfStudy ? `in ${profile.fieldOfStudy}` : ''}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500 mb-1">Profession</p>
                <p className="font-medium text-gray-900">{profile?.profession || 'Not set'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500 mb-1">Intro Line</p>
                <p className="font-medium text-gray-900 italic">"{profile?.introLine || 'Not set'}"</p>
              </div>
            </div>
          </div>

          {/* Audit Log */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
              <Shield className="w-5 h-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900">Admin Action Log</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {auditLogs.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">No admin actions taken on this account.</div>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id} className="p-4 flex gap-4 text-sm">
                    <div className="shrink-0 pt-0.5">
                      {log.action === 'suspended' && <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />}
                      {log.action === 'reactivated' && <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />}
                    </div>
                    <div>
                      <p className="text-gray-900">
                        <span className="font-semibold">{log.volunteerName || 'Unknown Admin'}</span> 
                        {' '}<span className="capitalize">{log.action}</span> the account.
                      </p>
                      {log.reason && <p className="text-gray-500 mt-1 bg-gray-50 p-2 rounded italic text-xs border border-gray-100">"{log.reason}"</p>}
                      <p className="text-gray-400 text-xs mt-1">{new Date(log.createdAt!).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Actions */}
        <div className="space-y-6">
          <AdminUserActions userId={user.id} isActive={user.isActive!} />
        </div>
      </div>
    </div>
  );
}

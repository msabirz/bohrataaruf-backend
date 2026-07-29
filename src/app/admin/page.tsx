import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { requireAdminAuth } from '@/lib/adminAuth';
import Link from 'next/link';
import { ChevronRight, Users, CheckCircle, Clock, XCircle, Heart, Share2, Mail, Flag } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardOverview() {
  const session = await requireAdminAuth();
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29); // 30 days including today
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  // 1. Fetch all data concurrently
  const [signupRows, verificationRows, matchRows, totalActiveUsersRaw] = await Promise.all([
    db.execute(sql`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users
      WHERE created_at >= ${thirtyDaysAgo.toISOString()}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `),
    db.execute(sql`
      SELECT status, COUNT(*) as count
      FROM verifications
      GROUP BY status
    `),
    db.execute(sql`
      SELECT 
        COUNT(*) as total, 
        SUM(CASE WHEN handoff_a_status = 'shared' AND handoff_b_status = 'shared' THEN 1 ELSE 0 END) as completed
      FROM matches
    `),
    db.execute(sql`SELECT COUNT(*) as count FROM users WHERE is_active = true`),
    db.execute(sql`SELECT COUNT(*) as count FROM contact_messages WHERE is_read = false`),
    db.execute(sql`SELECT COUNT(*) as count FROM reports WHERE status = 'pending'`)
  ]);

  // 2. Process Verifications
  let pendingCount = 0;
  let verifiedCount = 0;
  let rejectedCount = 0;
  
  const verData = Array.isArray(verificationRows) ? verificationRows : ((verificationRows as any).rows || []);
  for (const row of verData) {
    const count = Number(row.count) || 0;
    if (row.status === 'pending') pendingCount = count;
    else if (row.status === 'verified') verifiedCount = count;
    else if (row.status === 'rejected') rejectedCount = count;
  }

  // 3. Process Matches
  const matchData = Array.isArray(matchRows) ? matchRows : ((matchRows as any).rows || []);
  const totalMatches = matchData[0] ? Number(matchData[0].total) || 0 : 0;
  const completedHandoffs = matchData[0] ? Number(matchData[0].completed) || 0 : 0;

  // 4. Process Active Users
  const activeUserData = Array.isArray(totalActiveUsersRaw) ? totalActiveUsersRaw : ((totalActiveUsersRaw as any).rows || []);
  const totalActiveUsers = activeUserData[0] ? Number(activeUserData[0].count) || 0 : 0;

  // 5. Process Unread Messages
  const unreadMessagesData = Array.isArray(signupRows) ? arguments[4] : ((arguments[4] as any)?.rows || []);
  const unreadMessagesCount = unreadMessagesData[0] ? Number(unreadMessagesData[0].count) || 0 : 0;

  // 6. Process Pending Reports
  const pendingReportsData = Array.isArray(signupRows) ? arguments[5] : ((arguments[5] as any)?.rows || []);
  const pendingReportsCount = pendingReportsData[0] ? Number(pendingReportsData[0].count) || 0 : 0;

  // 7. Process Signups (Zero-fill for 30 days)
  const signupData = Array.isArray(signupRows) ? signupRows : ((signupRows as any).rows || []);
  const dailySignups = [];
  let todayCount = 0;
  let weekCount = 0;
  let monthCount = 0;
  
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    const found = signupData.find((row: any) => {
      const rowDateStr = row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date).split('T')[0];
      return rowDateStr === dateStr;
    });
    
    const count = found ? Number(found.count) || 0 : 0;
    dailySignups.push({ date: dateStr, count });
    
    monthCount += count;
    if (i < 7) weekCount += count;
    if (i === 0) todayCount = count;
  }
  
  const maxSignups = Math.max(...dailySignups.map(d => d.count), 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Platform Overview</h1>
        <p className="text-gray-500 mt-2">Welcome back, {session.name}. Here is the current health of the platform.</p>
      </div>

      {/* Top-Line Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Pending Verifications (Actionable) */}
        <Link href="/admin/verifications" className="block group">
          <div className="bg-white border-2 border-[#8C6A3F]/30 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-[#8C6A3F] transition-all flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Pending Verifications</p>
              <p className="text-3xl font-bold text-gray-900">{pendingCount}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-[#8C6A3F]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6 text-[#8C6A3F]" />
            </div>
          </div>
        </Link>

        {/* Pending Reports (Actionable) */}
        <Link href="/admin/reports" className="block group">
          <div className="bg-white border-2 border-red-500/30 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-red-500 transition-all flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Pending Reports</p>
              <p className="text-3xl font-bold text-gray-900">{pendingReportsCount}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Flag className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </Link>

        {/* Unread Messages (Actionable) */}
        <Link href="/admin/messages" className="block group">
          <div className="bg-white border-2 border-blue-500/30 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-500 transition-all flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Unread Messages</p>
              <p className="text-3xl font-bold text-gray-900">{unreadMessagesCount}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Mail className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </Link>

        {/* Total Users */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Active Users</p>
            <p className="text-3xl font-bold text-gray-900">{totalActiveUsers}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
        </div>

        {/* Verified Users */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Verified Users</p>
            <p className="text-3xl font-bold text-gray-900">{verifiedCount}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
        </div>

        {/* Matches Created */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Mutual Matches</p>
            <p className="text-3xl font-bold text-gray-900">{totalMatches}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-pink-50 flex items-center justify-center">
            <Heart className="w-6 h-6 text-pink-500" />
          </div>
        </div>

        {/* Completed Handoffs */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Completed Handoffs</p>
            <p className="text-3xl font-bold text-gray-900">{completedHandoffs}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center">
            <Share2 className="w-6 h-6 text-purple-500" />
          </div>
        </div>

        {/* Rejected Verifications */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Rejected Cards</p>
            <p className="text-3xl font-bold text-gray-900">{rejectedCount}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
            <XCircle className="w-6 h-6 text-red-500" />
          </div>
        </div>
      </div>

      {/* Signup Trend */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Signup Trend</h2>
            <p className="text-sm text-gray-500 mt-1">New user registrations over the last 30 days.</p>
          </div>
          <div className="flex gap-4">
            <div className="text-center px-4">
              <p className="text-2xl font-bold text-gray-900">{todayCount}</p>
              <p className="text-xs font-medium text-gray-500 uppercase">Today</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="text-center px-4">
              <p className="text-2xl font-bold text-gray-900">{weekCount}</p>
              <p className="text-xs font-medium text-gray-500 uppercase">7 Days</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="text-center px-4">
              <p className="text-2xl font-bold text-gray-900">{monthCount}</p>
              <p className="text-xs font-medium text-gray-500 uppercase">30 Days</p>
            </div>
          </div>
        </div>

        {/* Custom SVG Bar Chart */}
        <div className="w-full h-48 relative border-b border-gray-200 mt-4">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
            {dailySignups.map((d, i) => {
              const height = (d.count / maxSignups) * 100;
              const x = (i / 30) * 100;
              const width = (100 / 30) - 0.5; // Leave a tiny gap
              return (
                <g key={d.date} className="group cursor-pointer">
                  {/* Invisible tall rect to catch hover easily even if data bar is short */}
                  <rect 
                    x={`${x}%`} 
                    y="0" 
                    width={`${width}%`} 
                    height="100%" 
                    fill="transparent"
                  />
                  {/* The actual data bar */}
                  <rect 
                    x={`${x}%`} 
                    y={`${100 - height}%`} 
                    width={`${width}%`} 
                    height={`${height}%`} 
                    fill="#8C6A3F"
                    className="opacity-70 group-hover:opacity-100 transition-opacity"
                    rx="0.5"
                  />
                  <title>{`${d.date}: ${d.count} signups`}</title>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400 font-medium">
          <span>{dailySignups[0].date}</span>
          <span>{dailySignups[29].date} (Today)</span>
        </div>
      </div>
    </div>
  );
}

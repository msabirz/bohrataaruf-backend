import { db } from '@/lib/db';
import { verifications, profiles, users } from '@/lib/db/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import { requireAdminAuth } from '@/lib/adminAuth';
import ClientList from './ClientList';
import { getViewUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export default async function AdminVerificationsPage() {
  const session = await requireAdminAuth();

  // 1. Fetch pending verifications with profile data
  const pendingRows = await db
    .select({
      id: verifications.id,
      cardImageKey: verifications.cardImageKey,
      createdAt: verifications.createdAt,
      alias: profiles.alias,
      city: users.city,
    })
    .from(verifications)
    .leftJoin(users, eq(verifications.userId, users.id))
    .leftJoin(profiles, eq(verifications.userId, profiles.userId))
    .where(eq(verifications.status, 'pending'))
    .orderBy(desc(verifications.createdAt));

  // 2. Fetch today's reviewed count
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const statsRow = await db
    .select({ id: verifications.id })
    .from(verifications)
    .where(
      and(
        gte(verifications.reviewedAt, todayStart)
      )
    );
  
  const reviewedToday = statsRow.length;

  // Process data for client
  const itemsForClient = await Promise.all(pendingRows.map(async (row) => ({
    id: row.id,
    alias: row.alias,
    city: row.city,
    createdAt: row.createdAt,
    imageUrl: row.cardImageKey ? await getViewUrl(row.cardImageKey) : '',
  })));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Review Verifications</h1>
          <p className="text-gray-500 mt-2">Welcome back, {session.name}. Please review the pending ITS cards below.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200 text-center min-w-[100px]">
            <p className="text-2xl font-bold text-gray-800">{itemsForClient.length}</p>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</p>
          </div>
          <div className="bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200 text-center min-w-[100px]">
            <p className="text-2xl font-bold text-green-600">{reviewedToday}</p>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Done Today</p>
          </div>
        </div>
      </div>

      <ClientList items={itemsForClient} />
    </div>
  );
}

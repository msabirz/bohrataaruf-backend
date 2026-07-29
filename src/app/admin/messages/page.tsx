import { requireAdminAuth } from '@/lib/adminAuth';
import AdminMessagesClient from './AdminMessagesClient';

export const dynamic = 'force-dynamic';

export default async function AdminMessagesPage() {
  await requireAdminAuth();
  return <AdminMessagesClient />;
}

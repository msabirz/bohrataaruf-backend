import { requireAdminAuth } from '@/lib/adminAuth';
import AdminSharePanel from './AdminSharePanel';

export const dynamic = 'force-dynamic';

export default async function AdminSharePage() {
  await requireAdminAuth();
  return <AdminSharePanel />;
}

import { requireAdminAuth } from '@/lib/adminAuth';
import AdminReportsClient from './AdminReportsClient';

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  await requireAdminAuth();
  return <AdminReportsClient />;
}

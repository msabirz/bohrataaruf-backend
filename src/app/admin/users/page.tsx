import { requireAdminAuth } from '@/lib/adminAuth';
import AdminUsersList from './AdminUsersList';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  await requireAdminAuth();
  return <AdminUsersList />;
}

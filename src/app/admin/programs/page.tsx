import { requireAdminAuth } from '@/lib/adminAuth';
import AdminProgramsList from './AdminProgramsList';

export const dynamic = 'force-dynamic';

export default async function AdminProgramsPage() {
  await requireAdminAuth();
  return <AdminProgramsList />;
}

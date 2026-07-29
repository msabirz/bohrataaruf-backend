import { requireAdminAuth } from '@/lib/adminAuth';
import AdminVolunteersList from './AdminVolunteersList';

export const dynamic = 'force-dynamic';

export default async function AdminVolunteersPage() {
  const session = await requireAdminAuth();
  return <AdminVolunteersList currentVolunteerId={session.volunteerId} />;
}

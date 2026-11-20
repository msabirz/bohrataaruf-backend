import { requireAdminAuth } from '@/lib/adminAuth';
import SiteModeCard from './SiteModeCard';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  await requireAdminAuth();
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-500 text-sm mt-1">Site-wide switches. Changes apply straight away, with no redeploy.</p>
      </div>
      <SiteModeCard />
    </div>
  );
}

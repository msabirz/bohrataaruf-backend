import AdminLayout from '../layout';
import LifestyleTraitsClient from './LifestyleTraitsClient';

export default function LifestyleTraitsPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Lifestyle & Personality Traits</h1>
        <p className="text-gray-500 mt-1">Manage the binary trait-pair questions shown in Edit Profile (e.g. &quot;Coffee or Chai?&quot;).</p>
      </div>
      <LifestyleTraitsClient />
    </div>
  );
}

import AdminLayout from '../layout';
import AliasFrameworksClient from './AliasFrameworksClient';

export default function AliasFrameworksPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Alias Frameworks</h1>
        <p className="text-gray-500 mt-1">Manage dictionary sets for generating unique anonymous aliases.</p>
      </div>
      <AliasFrameworksClient />
    </div>
  );
}

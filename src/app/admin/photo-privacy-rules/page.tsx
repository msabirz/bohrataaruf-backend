import PhotoPrivacyRulesClient from './PhotoPrivacyRulesClient';

export default function PhotoPrivacyRulesPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Photo Privacy Rules</h1>
        <p className="text-gray-500 mt-1">Control which photo privacy modes each gender can choose from, and the default for new profiles. Changes apply immediately.</p>
      </div>
      <PhotoPrivacyRulesClient />
    </div>
  );
}

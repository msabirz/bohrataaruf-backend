import { requireAdminAuth } from '@/lib/adminAuth';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProgramForm } from '@/components/admin/ProgramForm';

export const dynamic = 'force-dynamic';

export default async function NewProgramPage() {
  await requireAdminAuth();

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/admin/programs" className="text-sm font-medium text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Taaruf Programs
      </Link>
      <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">New Taaruf Program</h1>
      <p className="text-gray-500 mb-6">Starts as a draft — publish it once you&rsquo;re ready for applications.</p>
      <ProgramForm />
    </div>
  );
}

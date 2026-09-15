import { requireAdminAuth } from '@/lib/adminAuth';
import { db } from '@/lib/db';
import { taarufPrograms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { isValidFormSchema } from '@/lib/programFormSchema';
import AdminProgramApplicationsList from './AdminProgramApplicationsList';

export const dynamic = 'force-dynamic';

export default async function ProgramApplicationsPage(props: { params: Promise<{ id: string }> }) {
  await requireAdminAuth();
  const { id } = await props.params;

  const program = await db.select().from(taarufPrograms).where(eq(taarufPrograms.id, id)).limit(1).then(r => r[0]);
  if (!program) return notFound();

  const fields = isValidFormSchema(program.formSchema) ? program.formSchema : [];

  return (
    <div className="max-w-5xl mx-auto">
      <Link href={`/admin/programs/${id}`} className="text-sm font-medium text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to {program.title}
      </Link>
      <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">Applications</h1>
      <p className="text-gray-500 mb-6">{program.title} — {program.city}</p>
      <AdminProgramApplicationsList programId={id} fields={fields} />
    </div>
  );
}

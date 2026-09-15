import { requireAdminAuth } from '@/lib/adminAuth';
import { db } from '@/lib/db';
import { taarufPrograms, taarufProgramApplications } from '@/lib/db/schema';
import { eq, sql as sqlOp } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { notFound } from 'next/navigation';
import { ProgramForm } from '@/components/admin/ProgramForm';
import { isValidFormSchema, type ProgramFormField } from '@/lib/programFormSchema';

export const dynamic = 'force-dynamic';

// Drizzle's `date` columns come back as plain "YYYY-MM-DD" strings already
// (not Date objects) with the neon-http driver — this just guards against
// null/undefined so <input type="date"> never gets a bad value.
function toDateInputValue(value: string | null): string {
  return value || '';
}

export default async function EditProgramPage(props: { params: Promise<{ id: string }> }) {
  await requireAdminAuth();
  const { id } = await props.params;

  const program = await db.select().from(taarufPrograms).where(eq(taarufPrograms.id, id)).limit(1).then(r => r[0]);
  if (!program) return notFound();

  const applicationCount = await db.select({ count: sqlOp<number>`count(*)::int` })
    .from(taarufProgramApplications).where(eq(taarufProgramApplications.programId, id))
    .then(r => r[0]?.count ?? 0);

  // Defensive: only trust what's actually shaped like a form schema —
  // a malformed/legacy value falls back to "no questions" rather than
  // crashing the edit page.
  const formFields: ProgramFormField[] = isValidFormSchema(program.formSchema) ? program.formSchema : [];

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/admin/programs" className="text-sm font-medium text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Taaruf Programs
      </Link>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">{program.title}</h1>
          <p className="text-gray-500">{program.city} · {new Date(program.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
        <Link
          href={`/admin/programs/${id}/applications`}
          className="shrink-0 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Users className="w-4 h-4" /> {applicationCount} application{applicationCount === 1 ? '' : 's'}
        </Link>
      </div>
      <ProgramForm
        programId={program.id}
        initial={{
          title: program.title,
          description: program.description || '',
          city: program.city,
          venueName: program.venueName || '',
          startDate: toDateInputValue(program.startDate),
          endDate: toDateInputValue(program.endDate),
          ageMinMale: program.ageMinMale?.toString() || '',
          ageMaxMale: program.ageMaxMale?.toString() || '',
          ageMinFemale: program.ageMinFemale?.toString() || '',
          ageMaxFemale: program.ageMaxFemale?.toString() || '',
          feeAmount: program.feeAmount?.toString() || '500',
          capacity: program.capacity?.toString() || '',
          registrationDeadline: toDateInputValue(program.registrationDeadline),
          status: program.status,
          featureOnHomepage: program.featureOnHomepage,
          featureUntil: toDateInputValue(program.featureUntil),
          formFields,
        }}
      />
    </div>
  );
}

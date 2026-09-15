// Shared between the admin form builder (src/components/admin/ProgramForm.tsx)
// and the public application form (src/app/(app)/events/[slug]/...) — one
// definition so the two never drift apart on what a field can be.
export type ProgramFormFieldType = 'text' | 'textarea' | 'select' | 'number';

export interface ProgramFormField {
  id: string;
  label: string;
  type: ProgramFormFieldType;
  required: boolean;
  // Only meaningful for type 'select'.
  options?: string[];
}

export function newProgramFormField(): ProgramFormField {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    label: '',
    type: 'text',
    required: false,
  };
}

// Loose validation, used both to sanitize admin input server-side and to
// enforce required fields on public submission — never trusts the client.
export function isValidFormSchema(value: unknown): value is ProgramFormField[] {
  if (!Array.isArray(value)) return false;
  return value.every((f) =>
    f && typeof f === 'object'
    && typeof f.id === 'string' && f.id.length > 0
    && typeof f.label === 'string'
    && ['text', 'textarea', 'select', 'number'].includes(f.type)
    && typeof f.required === 'boolean'
    && (f.type !== 'select' || Array.isArray(f.options)));
}

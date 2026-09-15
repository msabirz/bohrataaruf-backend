'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { type ProgramFormField, newProgramFormField } from '@/lib/programFormSchema';

export interface ProgramFormValues {
  title: string;
  description: string;
  city: string;
  venueName: string;
  startDate: string;
  endDate: string;
  ageMinMale: string;
  ageMaxMale: string;
  ageMinFemale: string;
  ageMaxFemale: string;
  feeAmount: string;
  capacity: string;
  registrationDeadline: string;
  status: string;
  featureOnHomepage: boolean;
  featureUntil: string;
  formFields: ProgramFormField[];
}

const EMPTY_VALUES: ProgramFormValues = {
  title: '', description: '', city: '', venueName: '', startDate: '', endDate: '',
  ageMinMale: '', ageMaxMale: '', ageMinFemale: '', ageMaxFemale: '',
  feeAmount: '500', capacity: '', registrationDeadline: '', status: 'draft',
  featureOnHomepage: false, featureUntil: '', formFields: [],
};

const FIELD_TYPE_LABELS: Record<ProgramFormField['type'], string> = {
  text: 'Short text', textarea: 'Long text', select: 'Multiple choice', number: 'Number',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#8C6A3F] focus:border-[#8C6A3F] transition-all';

export function ProgramForm({ programId, initial }: { programId?: string; initial?: Partial<ProgramFormValues> }) {
  const router = useRouter();
  const [values, setValues] = useState<ProgramFormValues>({ ...EMPTY_VALUES, ...initial });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const set = <K extends keyof ProgramFormValues>(key: K, val: ProgramFormValues[K]) =>
    setValues(v => ({ ...v, [key]: val }));

  const addField = () => setValues(v => ({ ...v, formFields: [...v.formFields, newProgramFormField()] }));
  const removeField = (id: string) => setValues(v => ({ ...v, formFields: v.formFields.filter(f => f.id !== id) }));
  const updateField = (id: string, patch: Partial<ProgramFormField>) =>
    setValues(v => ({ ...v, formFields: v.formFields.map(f => (f.id === id ? { ...f, ...patch } : f)) }));
  const moveField = (index: number, direction: -1 | 1) => {
    setValues(v => {
      const next = [...v.formFields];
      const target = index + direction;
      if (target < 0 || target >= next.length) return v;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...v, formFields: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const payload: Record<string, unknown> = {
        title: values.title,
        description: values.description || undefined,
        city: values.city,
        venueName: values.venueName || undefined,
        startDate: values.startDate,
        endDate: values.endDate || undefined,
        ageMinMale: values.ageMinMale ? Number(values.ageMinMale) : undefined,
        ageMaxMale: values.ageMaxMale ? Number(values.ageMaxMale) : undefined,
        ageMinFemale: values.ageMinFemale ? Number(values.ageMinFemale) : undefined,
        ageMaxFemale: values.ageMaxFemale ? Number(values.ageMaxFemale) : undefined,
        feeAmount: values.feeAmount ? Number(values.feeAmount) : undefined,
        capacity: values.capacity ? Number(values.capacity) : undefined,
        registrationDeadline: values.registrationDeadline || undefined,
      };

      if (programId) {
        // Edit mode also carries status + feature fields, which the create
        // step intentionally leaves at their server-side defaults.
        payload.status = values.status;
        payload.featureOnHomepage = values.featureOnHomepage;
        payload.featureUntil = values.featureOnHomepage ? (values.featureUntil || null) : null;
        // Drop any question left with a blank label rather than saving
        // dead weight the public form would render with no text.
        payload.formSchema = values.formFields.filter(f => f.label.trim().length > 0);

        const res = await fetch(`/api/admin/programs/${programId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
        setMessage('Saved.');
      } else {
        const res = await fetch('/api/admin/programs', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Create failed');
        const data = await res.json();
        router.push(`/admin/programs/${data.program.id}`);
        return;
      }
    } catch (err: any) {
      setMessage(err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="text-sm font-bold text-gray-900 mb-4">Program details</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Title">
              <input required value={values.title} onChange={e => set('title', e.target.value)} className={inputClass} placeholder="Jamnagar Taaruf Gathering" />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Description">
              <textarea value={values.description} onChange={e => set('description', e.target.value)} className={inputClass} rows={3} placeholder="A day set aside for members of our community to meet in person..." />
            </Field>
          </div>
          <Field label="City / Venue">
            <div className="flex gap-2">
              <input required value={values.city} onChange={e => set('city', e.target.value)} className={inputClass} placeholder="Jamnagar" />
              <input value={values.venueName} onChange={e => set('venueName', e.target.value)} className={inputClass} placeholder="Venue (optional)" />
            </div>
          </Field>
          <Field label="Fee (₹, charged on selection)">
            <input type="number" min={0} value={values.feeAmount} onChange={e => set('feeAmount', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Start date">
            <input required type="date" value={values.startDate} onChange={e => set('startDate', e.target.value)} className={inputClass} />
          </Field>
          <Field label="End date">
            <input type="date" value={values.endDate} onChange={e => set('endDate', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Age range — Male">
            <div className="flex items-center gap-2">
              <input type="number" min={18} value={values.ageMinMale} onChange={e => set('ageMinMale', e.target.value)} className={inputClass} placeholder="Min" />
              <span className="text-gray-400">–</span>
              <input type="number" min={18} value={values.ageMaxMale} onChange={e => set('ageMaxMale', e.target.value)} className={inputClass} placeholder="Max" />
            </div>
          </Field>
          <Field label="Age range — Female">
            <div className="flex items-center gap-2">
              <input type="number" min={18} value={values.ageMinFemale} onChange={e => set('ageMinFemale', e.target.value)} className={inputClass} placeholder="Min" />
              <span className="text-gray-400">–</span>
              <input type="number" min={18} value={values.ageMaxFemale} onChange={e => set('ageMaxFemale', e.target.value)} className={inputClass} placeholder="Max" />
            </div>
          </Field>
          <Field label="Capacity (seats)">
            <input type="number" min={0} value={values.capacity} onChange={e => set('capacity', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Registration deadline">
            <input type="date" value={values.registrationDeadline} onChange={e => set('registrationDeadline', e.target.value)} className={inputClass} />
          </Field>
        </div>
      </div>

      {programId && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <div className="text-sm font-bold text-gray-900 mb-4">Status</div>
            <div className="flex gap-2">
              {['draft', 'published', 'closed', 'completed'].map(s => (
                <button
                  key={s} type="button" onClick={() => set('status', s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${values.status === s ? 'bg-[#8C6A3F] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <div className="flex items-start justify-between gap-5">
              <div className="flex gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-amber-200 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-amber-800" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 mb-1">Feature on Homepage</div>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-md">
                    Show this program as a featured banner on bohrataaruf.com&rsquo;s main homepage — the site&rsquo;s highest-traffic page, seen by visitors before they&rsquo;ve even signed up. Also shown automatically on Discover for signed-in users whose city matches, separate from this toggle.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={values.featureOnHomepage}
                onClick={() => set('featureOnHomepage', !values.featureOnHomepage)}
                className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${values.featureOnHomepage ? 'bg-[#8C6A3F]' : 'bg-gray-300'}`}
              >
                <span className={`absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${values.featureOnHomepage ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            {values.featureOnHomepage && (
              <div className="mt-4 pt-4 border-t border-amber-200 max-w-xs">
                <Field label="Feature until">
                  <input type="date" value={values.featureUntil} onChange={e => set('featureUntil', e.target.value)} className={inputClass + ' bg-white'} />
                </Field>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="text-sm font-bold text-gray-900">Application questions</div>
                <p className="text-xs text-gray-500 mt-1 max-w-md">
                  Shown to applicants on the public form, in this order, in addition to their name and age (always included automatically).
                </p>
              </div>
              <button
                type="button" onClick={addField}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5 flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Add question
              </button>
            </div>

            {values.formFields.length === 0 ? (
              <p className="text-sm text-gray-400 italic mt-4">No custom questions yet — applicants will just confirm their name and age.</p>
            ) : (
              <div className="space-y-3 mt-4">
                {values.formFields.map((field, index) => (
                  <div key={field.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col gap-1 pt-1.5 flex-shrink-0">
                        <button type="button" onClick={() => moveField(index, -1)} disabled={index === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400">
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => moveField(index, 1)} disabled={index === values.formFields.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-[1fr_auto] gap-3">
                          <input
                            value={field.label} onChange={e => updateField(field.id, { label: e.target.value })}
                            placeholder="Question text, e.g. Why would you like to attend?"
                            className={inputClass + ' bg-white'}
                          />
                          <select
                            value={field.type}
                            onChange={e => updateField(field.id, { type: e.target.value as ProgramFormField['type'], options: e.target.value === 'select' ? (field.options?.length ? field.options : ['']) : undefined })}
                            className={inputClass + ' bg-white w-40'}
                          >
                            {Object.entries(FIELD_TYPE_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                          </select>
                        </div>

                        {field.type === 'select' && (
                          <div className="space-y-1.5 pl-1">
                            {(field.options || ['']).map((opt, optIndex) => (
                              <div key={optIndex} className="flex items-center gap-2">
                                <input
                                  value={opt}
                                  onChange={e => {
                                    const next = [...(field.options || [])];
                                    next[optIndex] = e.target.value;
                                    updateField(field.id, { options: next });
                                  }}
                                  placeholder={`Option ${optIndex + 1}`}
                                  className={inputClass + ' bg-white text-xs py-1.5'}
                                />
                                <button
                                  type="button"
                                  onClick={() => updateField(field.id, { options: (field.options || []).filter((_, i) => i !== optIndex) })}
                                  disabled={(field.options?.length || 0) <= 1}
                                  className="text-gray-400 hover:text-red-600 disabled:opacity-30 flex-shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => updateField(field.id, { options: [...(field.options || []), ''] })}
                              className="text-xs font-medium text-[#8C6A3F] hover:underline"
                            >
                              + Add option
                            </button>
                          </div>
                        )}

                        <label className="flex items-center gap-2 text-xs text-gray-600">
                          <input type="checkbox" checked={field.required} onChange={e => updateField(field.id, { required: e.target.checked })} className="accent-[#8C6A3F]" />
                          Required
                        </label>
                      </div>

                      <button type="button" onClick={() => removeField(field.id)} className="text-gray-400 hover:text-red-600 flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit" disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-[#8C6A3F] text-white font-semibold text-sm hover:bg-[#7a5b35] transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : programId ? 'Save Changes' : 'Create Program'}
        </button>
        {message && <span className={`text-sm ${message === 'Saved.' ? 'text-green-700' : 'text-red-600'}`}>{message}</span>}
      </div>
    </form>
  );
}

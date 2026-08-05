'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Pause, AlertCircle, Plus, X, Pencil } from 'lucide-react';
import { LifestyleIcon } from '@/lib/lifestyleIcons';

interface TraitPair {
  id: string;
  slug: string;
  questionLabel: string;
  leftOptionKey: string;
  leftOptionLabel: string;
  leftIconMobile: string;
  leftIconWeb: string;
  rightOptionKey: string;
  rightOptionLabel: string;
  rightIconMobile: string;
  rightIconWeb: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
}

const EMPTY_FORM = {
  slug: '',
  questionLabel: '',
  leftOptionKey: '',
  leftOptionLabel: '',
  leftIconMobile: '',
  leftIconWeb: '',
  rightOptionKey: '',
  rightOptionLabel: '',
  rightIconMobile: '',
  rightIconWeb: '',
  sortOrder: 0,
};

export default function LifestyleTraitsClient() {
  const [pairs, setPairs] = useState<TraitPair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPairs();
  }, []);

  const fetchPairs = async () => {
    try {
      const res = await fetch('/api/admin/lifestyle-traits');
      if (res.ok) {
        const data = await res.json();
        setPairs(data.pairs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const startCreate = () => {
    setForm({ ...EMPTY_FORM, sortOrder: pairs.length });
    setEditingId(null);
    setError(null);
    setShowForm(true);
  };

  const startEdit = (pair: TraitPair) => {
    setForm({
      slug: pair.slug,
      questionLabel: pair.questionLabel,
      leftOptionKey: pair.leftOptionKey,
      leftOptionLabel: pair.leftOptionLabel,
      leftIconMobile: pair.leftIconMobile,
      leftIconWeb: pair.leftIconWeb,
      rightOptionKey: pair.rightOptionKey,
      rightOptionLabel: pair.rightOptionLabel,
      rightIconMobile: pair.rightIconMobile,
      rightIconWeb: pair.rightIconWeb,
      sortOrder: pair.sortOrder,
    });
    setEditingId(pair.id);
    setError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);
    try {
      if (editingId) {
        const { slug, ...updates } = form;
        const res = await fetch('/api/admin/lifestyle-traits', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...updates }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Update failed');
        }
      } else {
        const res = await fetch('/api/admin/lifestyle-traits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Create failed');
        }
      }
      closeForm();
      fetchPairs();
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      setPairs(pairs.map(p => p.id === id ? { ...p, active: !currentStatus } : p));
      await fetch('/api/admin/lifestyle-traits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !currentStatus }),
      });
    } catch (e) {
      fetchPairs(); // revert
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Trait Pairs</h2>
          <button
            onClick={startCreate}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2 text-sm font-medium"
          >
            <Plus size={16} /> Add Pair
          </button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading...</div>
        ) : pairs.length === 0 ? (
          <div className="py-8 text-center text-gray-500 border border-dashed rounded-lg">No trait pairs yet.</div>
        ) : (
          <div className="space-y-3">
            {pairs.map(pair => (
              <div key={pair.id} className={`p-4 rounded-lg border flex items-center justify-between ${pair.active ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-700">
                      <LifestyleIcon name={pair.leftIconWeb} size={16} />
                    </span>
                    <span className="font-medium text-gray-800">{pair.leftOptionLabel}</span>
                    <span className="text-gray-400">/</span>
                    <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-700">
                      <LifestyleIcon name={pair.rightIconWeb} size={16} />
                    </span>
                    <span className="font-medium text-gray-800">{pair.rightOptionLabel}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{pair.questionLabel}</p>
                    <p className="text-xs text-gray-500">slug: {pair.slug} · order: {pair.sortOrder}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(pair)} className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100" title="Edit">
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => toggleActive(pair.id, pair.active)}
                    className={`p-1.5 rounded-md flex items-center justify-center ${pair.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-200'}`}
                    title={pair.active ? 'Deactivate' : 'Activate'}
                  >
                    {pair.active ? <CheckCircle2 size={20} /> : <Pause size={20} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Trait Pair' : 'New Trait Pair'}</h3>
              <button onClick={closeForm} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-md flex gap-2 items-start text-sm">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Slug (lowercase, underscores)</label>
                <input
                  type="text"
                  value={form.slug}
                  disabled={!!editingId}
                  onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="coffee_or_chai"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Question Label</label>
                <input
                  type="text"
                  value={form.questionLabel}
                  onChange={(e) => setForm(f => ({ ...f, questionLabel: e.target.value }))}
                  placeholder="Coffee or Chai?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <IconSideForm
                  title="Left option"
                  optionKey={form.leftOptionKey}
                  optionLabel={form.leftOptionLabel}
                  iconMobile={form.leftIconMobile}
                  iconWeb={form.leftIconWeb}
                  onOptionKey={(v) => setForm(f => ({ ...f, leftOptionKey: v }))}
                  onOptionLabel={(v) => setForm(f => ({ ...f, leftOptionLabel: v }))}
                  onIconMobile={(v) => setForm(f => ({ ...f, leftIconMobile: v }))}
                  onIconWeb={(v) => setForm(f => ({ ...f, leftIconWeb: v }))}
                />
                <IconSideForm
                  title="Right option"
                  optionKey={form.rightOptionKey}
                  optionLabel={form.rightOptionLabel}
                  iconMobile={form.rightIconMobile}
                  iconWeb={form.rightIconWeb}
                  onOptionKey={(v) => setForm(f => ({ ...f, rightOptionKey: v }))}
                  onOptionLabel={(v) => setForm(f => ({ ...f, rightOptionLabel: v }))}
                  onIconMobile={(v) => setForm(f => ({ ...f, rightIconMobile: v }))}
                  onIconWeb={(v) => setForm(f => ({ ...f, rightIconWeb: v }))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button onClick={closeForm} className="px-5 py-2 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IconSideForm({
  title, optionKey, optionLabel, iconMobile, iconWeb,
  onOptionKey, onOptionLabel, onIconMobile, onIconWeb,
}: {
  title: string; optionKey: string; optionLabel: string; iconMobile: string; iconWeb: string;
  onOptionKey: (v: string) => void; onOptionLabel: (v: string) => void; onIconMobile: (v: string) => void; onIconWeb: (v: string) => void;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{title}</p>

      <div>
        <label className="block text-xs text-gray-600 mb-1">Option key</label>
        <input type="text" value={optionKey} onChange={(e) => onOptionKey(e.target.value)} placeholder="coffee" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Option label</label>
        <input type="text" value={optionLabel} onChange={(e) => onOptionLabel(e.target.value)} placeholder="Coffee" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
      </div>

      <div>
        <label className="block text-xs text-gray-600 mb-1 flex items-center justify-between">
          <span>Mobile icon (Feather)</span>
          <a href="https://feathericons.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-normal">docs ↗</a>
        </label>
        <div className="flex items-center gap-2">
          <input type="text" value={iconMobile} onChange={(e) => onIconMobile(e.target.value)} placeholder="coffee or custom:teacup" className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm" />
          <span className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center text-gray-700 shrink-0">
            {iconMobile ? <LifestyleIcon name={iconMobile} size={16} /> : <span className="text-gray-300 text-xs">–</span>}
          </span>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">Preview approximated via a similar web icon set (Feather can't render in a browser) — most names match lucide exactly, but double-check unusual ones against the docs link.</p>
      </div>

      <div>
        <label className="block text-xs text-gray-600 mb-1 flex items-center justify-between">
          <span>Web icon (lucide)</span>
          <a href="https://lucide.dev/icons" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-normal">docs ↗</a>
        </label>
        <div className="flex items-center gap-2">
          <input type="text" value={iconWeb} onChange={(e) => onIconWeb(e.target.value)} placeholder="coffee or custom:teacup" className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm" />
          <span className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center text-gray-700 shrink-0">
            {iconWeb ? <LifestyleIcon name={iconWeb} size={16} /> : <span className="text-gray-300 text-xs">–</span>}
          </span>
        </div>
      </div>
    </div>
  );
}

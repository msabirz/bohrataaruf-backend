'use client';

import { useState, useEffect } from 'react';
import { Save, CheckCircle2 } from 'lucide-react';

type Mode = 'always' | 'three_then_request' | 'request_only' | 'blur_until_match';

const ALL_MODES: { value: Mode; label: string }[] = [
  { value: 'always', label: 'Show photo always' },
  { value: 'three_then_request', label: 'Show 3 times, then allow request' },
  { value: 'request_only', label: 'Show only on request' },
  { value: 'blur_until_match', label: 'Blur until match' },
];

interface Rule {
  gender: 'male' | 'female';
  allowedModes: Mode[];
  defaultMode: Mode;
}

export default function PhotoPrivacyRulesClient() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingGender, setSavingGender] = useState<string | null>(null);
  const [savedGender, setSavedGender] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/admin/photo-privacy-rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = (gender: 'male' | 'female', mode: Mode) => {
    setRules(prev => prev.map(r => {
      if (r.gender !== gender) return r;
      const allowedModes = r.allowedModes.includes(mode)
        ? r.allowedModes.filter(m => m !== mode)
        : [...r.allowedModes, mode];
      // If the default mode was just unchecked, fall back to the first remaining allowed mode.
      const defaultMode = allowedModes.includes(r.defaultMode) ? r.defaultMode : (allowedModes[0] ?? r.defaultMode);
      return { ...r, allowedModes, defaultMode };
    }));
  };

  const setDefault = (gender: 'male' | 'female', mode: Mode) => {
    setRules(prev => prev.map(r => r.gender === gender ? { ...r, defaultMode: mode } : r));
  };

  const handleSave = async (rule: Rule) => {
    setError(null);
    if (rule.allowedModes.length === 0) {
      setError('At least one mode must be allowed.');
      return;
    }
    setSavingGender(rule.gender);
    try {
      const res = await fetch('/api/admin/photo-privacy-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save');
      }
      setSavedGender(rule.gender);
      setTimeout(() => setSavedGender(null), 2000);
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSavingGender(null);
    }
  };

  if (isLoading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

      {rules.map((rule) => (
        <div key={rule.gender} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 capitalize mb-4">{rule.gender}</h2>

          <div className="space-y-3 mb-6">
            {ALL_MODES.map((mode) => (
              <label key={mode.value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rule.allowedModes.includes(mode.value)}
                  onChange={() => toggleMode(rule.gender, mode.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-800 flex-1">{mode.label}</span>
                {rule.allowedModes.includes(mode.value) && (
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                    <input
                      type="radio"
                      name={`default-${rule.gender}`}
                      checked={rule.defaultMode === mode.value}
                      onChange={() => setDefault(rule.gender, mode.value)}
                    />
                    Default
                  </label>
                )}
              </label>
            ))}
          </div>

          <button
            onClick={() => handleSave(rule)}
            disabled={savingGender === rule.gender}
            className="inline-flex items-center gap-2 bg-[#8C6A3F] hover:bg-[#7a5a34] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {savedGender === rule.gender ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {savingGender === rule.gender ? 'Saving...' : savedGender === rule.gender ? 'Saved' : 'Save changes'}
          </button>
        </div>
      ))}
    </div>
  );
}

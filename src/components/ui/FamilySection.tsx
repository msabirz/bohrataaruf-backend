import React from 'react';
import { Chip } from '@/components/ui/Chip';

interface FamilySectionProps {
  brothersCount: number | null | undefined;
  brothersMarriedCount: number | null | undefined;
  sistersCount: number | null | undefined;
  sistersMarriedCount: number | null | undefined;
  onChange: (updates: {
    brothersCount?: number | null;
    brothersMarriedCount?: number | null;
    sistersCount?: number | null;
    sistersMarriedCount?: number | null;
  }) => void;
}

const COUNT_OPTIONS = [0, 1, 2, 3, 4, 5];

// Web port of the mobile app's FamilySection — same chip-based counts and
// the same "married count can't exceed sibling count" clamping logic.
export function FamilySection({ brothersCount, brothersMarriedCount, sistersCount, sistersMarriedCount, onChange }: FamilySectionProps) {
  const currentBrothers = brothersCount ?? null;
  const currentBrothersMarried = brothersMarriedCount ?? null;
  const currentSisters = sistersCount ?? null;
  const currentSistersMarried = sistersMarriedCount ?? null;

  const handleBrothersChange = (num: number) => {
    const newMarried = currentBrothersMarried !== null && currentBrothersMarried > num ? num : currentBrothersMarried;
    onChange({ brothersCount: num, brothersMarriedCount: num === 0 ? null : newMarried });
  };

  const handleSistersChange = (num: number) => {
    const newMarried = currentSistersMarried !== null && currentSistersMarried > num ? num : currentSistersMarried;
    onChange({ sistersCount: num, sistersMarriedCount: num === 0 ? null : newMarried });
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-muted mb-1.5">Number of Brothers</label>
        <div className="flex flex-wrap gap-2">
          {COUNT_OPTIONS.map((num) => (
            <Chip key={`bro-${num}`} label={num === 5 ? '5+' : `${num}`} selected={currentBrothers === num} onClick={() => handleBrothersChange(num)} />
          ))}
        </div>
        {currentBrothers !== null && currentBrothers > 0 && (
          <div className="mt-3 pl-3 border-l-2 border-accent/30">
            <label className="block text-xs font-medium text-muted mb-1.5">How many brothers are married?</label>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: currentBrothers + 1 }, (_, i) => i).map((num) => (
                <Chip key={`bro-m-${num}`} label={`${num}`} selected={currentBrothersMarried === num} onClick={() => onChange({ brothersMarriedCount: num })} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-muted mb-1.5">Number of Sisters</label>
        <div className="flex flex-wrap gap-2">
          {COUNT_OPTIONS.map((num) => (
            <Chip key={`sis-${num}`} label={num === 5 ? '5+' : `${num}`} selected={currentSisters === num} onClick={() => handleSistersChange(num)} />
          ))}
        </div>
        {currentSisters !== null && currentSisters > 0 && (
          <div className="mt-3 pl-3 border-l-2 border-accent/30">
            <label className="block text-xs font-medium text-muted mb-1.5">How many sisters are married?</label>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: currentSisters + 1 }, (_, i) => i).map((num) => (
                <Chip key={`sis-m-${num}`} label={`${num}`} selected={currentSistersMarried === num} onClick={() => onChange({ sistersMarriedCount: num })} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

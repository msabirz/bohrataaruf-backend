import React from 'react';
import { Chip } from '@/components/ui/Chip';

interface ChildrenSectionProps {
  maritalStatus: 'never_married' | 'divorced' | 'widowed' | string | null | undefined;
  hasChildren: boolean | null | undefined;
  childrenCount: number | null | undefined;
  childrenBoysCount: number | null | undefined;
  childrenGirlsCount: number | null | undefined;
  childrenLivingStatus: 'with_me' | 'not_with_me' | 'adults_independent' | null | undefined;
  onChange: (updates: {
    hasChildren?: boolean | null;
    childrenCount?: number | null;
    childrenBoysCount?: number | null;
    childrenGirlsCount?: number | null;
    childrenLivingStatus?: 'with_me' | 'not_with_me' | 'adults_independent' | null;
  }) => void;
}

const TOTAL_OPTIONS = [1, 2, 3, 4, 5];
const LIVING_OPTIONS = [
  { value: 'with_me' as const, label: 'Living with me' },
  { value: 'not_with_me' as const, label: 'Not living with me' },
  { value: 'adults_independent' as const, label: 'Adults / Independent' },
];

// Web port of the mobile app's ChildrenSection — only rendered for
// divorced/widowed users, same as onboarding/basics.tsx there.
export function ChildrenSection({ maritalStatus, hasChildren, childrenCount, childrenBoysCount, childrenGirlsCount, childrenLivingStatus, onChange }: ChildrenSectionProps) {
  if (maritalStatus !== 'divorced' && maritalStatus !== 'widowed') {
    return null;
  }

  const currentHasChildren = hasChildren ?? null;
  const currentTotal = childrenCount ?? null;
  const currentBoys = childrenBoysCount ?? null;
  const currentGirls = childrenGirlsCount ?? null;

  const handleHasChildrenChange = (val: boolean) => {
    if (!val) {
      onChange({ hasChildren: false, childrenCount: null, childrenBoysCount: null, childrenGirlsCount: null, childrenLivingStatus: null });
    } else {
      onChange({ hasChildren: true, childrenCount: currentTotal ?? 1 });
    }
  };

  const handleTotalChange = (num: number) => {
    const newBoys = currentBoys !== null && currentBoys > num ? num : currentBoys;
    const newGirls = currentGirls !== null && (newBoys || 0) + currentGirls > num ? Math.max(0, num - (newBoys || 0)) : currentGirls;
    onChange({ childrenCount: num, childrenBoysCount: newBoys, childrenGirlsCount: newGirls });
  };

  const handleBoysChange = (num: number) => {
    const maxGirls = (currentTotal || 1) - num;
    const newGirls = currentGirls !== null && currentGirls > maxGirls ? maxGirls : currentGirls;
    onChange({ childrenBoysCount: num, childrenGirlsCount: newGirls });
  };

  const handleGirlsChange = (num: number) => {
    const maxBoys = (currentTotal || 1) - num;
    const newBoys = currentBoys !== null && currentBoys > maxBoys ? maxBoys : currentBoys;
    onChange({ childrenGirlsCount: num, childrenBoysCount: newBoys });
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-muted mb-1.5">Do you have children?</label>
        <div className="flex gap-2">
          <Chip label="No" selected={currentHasChildren === false} onClick={() => handleHasChildrenChange(false)} />
          <Chip label="Yes" selected={currentHasChildren === true} onClick={() => handleHasChildrenChange(true)} />
        </div>
      </div>

      {currentHasChildren && (
        <div className="space-y-5 pt-1">
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Total Children</label>
            <div className="flex flex-wrap gap-2">
              {TOTAL_OPTIONS.map((num) => (
                <Chip key={`tot-${num}`} label={num === 5 ? '5+' : `${num}`} selected={currentTotal === num} onClick={() => handleTotalChange(num)} />
              ))}
            </div>
          </div>

          {currentTotal !== null && currentTotal > 0 && (
            <div className="pl-3 border-l-2 border-accent/30 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">Boys (Optional)</label>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: currentTotal + 1 }, (_, i) => i).map((num) => (
                    <Chip key={`boys-${num}`} label={`${num}`} selected={currentBoys === num} onClick={() => handleBoysChange(num)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">Girls (Optional)</label>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: currentTotal + 1 }, (_, i) => i).map((num) => (
                    <Chip key={`girls-${num}`} label={`${num}`} selected={currentGirls === num} onClick={() => handleGirlsChange(num)} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Living Situation</label>
            <div className="flex flex-wrap gap-2">
              {LIVING_OPTIONS.map((opt) => (
                <Chip key={opt.value} label={opt.label} selected={childrenLivingStatus === opt.value} onClick={() => onChange({ childrenLivingStatus: opt.value })} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useMemo, useState } from 'react';

export interface CompletionBreakdownItem {
  field: string;
  label: string;
  completed: boolean;
  weight: number;
  tier: number;
  route?: string;
}

interface CompletionBreakdownCardProps {
  percentage: number;
  breakdown: CompletionBreakdownItem[];
  isComplete: boolean;
  verificationStatus?: string;
  onFieldClick?: (item: CompletionBreakdownItem) => void;
}

const TIER_META: Record<number, { title: string; subtitle: string; totalWeight: number }> = {
  1: { title: 'Core Essentials', subtitle: 'The most important parts of your profile', totalWeight: 40 },
  2: { title: 'Partner Preferences', subtitle: 'What you’re looking for', totalWeight: 40 },
  3: { title: 'Background & Details', subtitle: 'About your family and background', totalWeight: 20 },
};

export function CompletionBreakdownCard({ percentage, breakdown, isComplete, verificationStatus, onFieldClick }: CompletionBreakdownCardProps) {
  const tiers = useMemo(() => {
    const grouped = new Map<number, CompletionBreakdownItem[]>();
    for (const item of breakdown) {
      const list = grouped.get(item.tier) ?? [];
      list.push(item);
      grouped.set(item.tier, list);
    }
    return [1, 2, 3]
      .filter((tier) => grouped.has(tier))
      .map((tier) => ({ tier, items: grouped.get(tier)! }));
  }, [breakdown]);

  const [expanded, setExpanded] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    for (const { tier, items } of tiers) {
      initial[tier] = !items.every((i) => i.completed);
    }
    return initial;
  });

  const toggleTier = (tier: number) => {
    setExpanded((prev) => ({ ...prev, [tier]: !prev[tier] }));
  };

  const firstIncomplete = breakdown.find((i) => !i.completed);

  if (isComplete || percentage >= 100) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-surface" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
        </div>
        <span className="text-base font-semibold text-foreground">Profile complete</span>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-base font-semibold text-foreground">Profile completion</span>
        <span className="text-lg font-bold text-primary">{percentage}%</span>
      </div>
      <div className="h-1.5 w-full bg-border rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-gradient-to-r from-accent to-primary rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted mb-6">
        {100 - percentage}% remaining — finish to be ready
      </p>

      <p className="text-xs uppercase tracking-wider text-muted font-medium mb-4">
        What counts towards your score
      </p>

      {tiers.map(({ tier, items }) => {
        const meta = TIER_META[tier];
        const completedCount = items.filter((i) => i.completed).length;
        const isExpanded = expanded[tier] ?? true;

        return (
          <div key={tier} className="border-t border-border pt-4 mt-4 first:mt-0 first:border-t-0 first:pt-0">
            <button
              type="button"
              onClick={() => toggleTier(tier)}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-foreground">
                  {meta?.title ?? `Tier ${tier}`}
                </span>
                <span className="text-xs text-muted ml-2">{meta?.totalWeight}%</span>
                <p className="text-xs text-muted mt-0.5">
                  {completedCount} of {items.length} complete
                </p>
              </div>
              <svg
                className={`w-4 h-4 text-muted shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className="mt-4 space-y-4">
                {items.map((item) => {
                  const isPendingVerification = item.field === 'itsVerification' && !item.completed && verificationStatus === 'pending';
                  const clickable = !!onFieldClick;
                  return (
                    <div key={item.field}>
                      <button
                        type="button"
                        disabled={!clickable}
                        onClick={() => onFieldClick?.(item)}
                        className={`w-full flex items-center gap-3 text-left ${clickable ? 'cursor-pointer hover:opacity-70 transition-opacity' : 'cursor-default'}`}
                      >
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${item.completed ? 'bg-primary' : 'border border-border bg-transparent'}`}>
                          {item.completed && (
                            <svg className="w-2.5 h-2.5 text-surface" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                          )}
                        </div>
                        <span className="text-sm font-medium text-foreground flex-1">{item.label}</span>
                        <span className={`text-xs ${item.completed ? 'text-primary' : 'text-muted'}`}>{Math.round(item.weight)}%</span>
                        {clickable && (
                          <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                        )}
                      </button>
                      {isPendingVerification && (
                        <p className="text-xs mt-1 ml-7 text-accent">Pending admin review</p>
                      )}
                      <div className="h-1 rounded-full bg-border overflow-hidden mt-1.5 ml-7">
                        <div
                          className={`h-full rounded-full ${item.completed ? 'bg-gradient-to-r from-accent to-primary w-full' : 'w-0'}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {firstIncomplete && (
        // firstIncomplete.route is a mobile-app path (e.g. /account/edit,
        // /onboarding/preferences) — none of those exist on web. This card
        // already lives on /profile, so a Link there would be a no-op;
        // every field is reachable by switching to the right tab instead,
        // same mechanism as clicking a field row.
        <button
          type="button"
          onClick={() => onFieldClick?.(firstIncomplete)}
          className="w-full flex items-center justify-center bg-primary text-surface font-semibold text-sm py-3.5 rounded-xl mt-6 hover:opacity-90 transition-opacity"
        >
          Complete {firstIncomplete.label} →
        </button>
      )}
    </div>
  );
}

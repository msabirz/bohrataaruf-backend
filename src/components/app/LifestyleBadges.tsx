'use client';

import React from 'react';
import { LifestyleIcon } from '@/lib/lifestyleIcons';
import type { TraitPair } from '@/components/app/LifestyleToggle';

// Renders only the traits a profile has actually answered — an absent key
// in lifestyleAnswers means unanswered, not "shown as unanswered."
export function LifestyleBadges({
  answers,
  traitPairs,
}: {
  answers: Record<string, string> | null | undefined;
  traitPairs: TraitPair[];
}) {
  if (!answers || traitPairs.length === 0) return null;

  const badges = traitPairs
    .map((pair) => {
      const answer = answers[pair.slug];
      if (answer === pair.leftOptionKey) return { label: pair.leftOptionLabel, icon: pair.leftIconWeb };
      if (answer === pair.rightOptionKey) return { label: pair.rightOptionLabel, icon: pair.rightIconWeb };
      return null;
    })
    .filter((b): b is { label: string; icon: string } => b !== null);

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-light/40 border border-accent/20 text-xs font-medium text-primary">
          <LifestyleIcon name={badge.icon} size={14} />
          {badge.label}
        </span>
      ))}
    </div>
  );
}

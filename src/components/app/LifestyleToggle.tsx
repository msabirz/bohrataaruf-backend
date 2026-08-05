'use client';

import React from 'react';
import { LifestyleIcon } from '@/lib/lifestyleIcons';

export interface TraitPair {
  id: string;
  slug: string;
  questionLabel: string;
  leftOptionKey: string;
  leftOptionLabel: string;
  leftIconWeb: string;
  rightOptionKey: string;
  rightOptionLabel: string;
  rightIconWeb: string;
}

interface LifestyleToggleProps {
  pair: TraitPair;
  value?: string; // selected option key, or undefined if unanswered
  onChange: (optionKey: string) => void;
  badgeDelay?: number; // stagger, in seconds
}

export function LifestyleToggle({ pair, value, onChange, badgeDelay = 0 }: LifestyleToggleProps) {
  const leftSelected = value === pair.leftOptionKey;
  const rightSelected = value === pair.rightOptionKey;

  return (
    <div>
      <p className="text-sm font-semibold text-foreground mb-2">{pair.questionLabel}</p>
      <div className="flex rounded-full border border-dotted border-accent overflow-hidden">
        <button
          type="button"
          onClick={() => onChange(pair.leftOptionKey)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium transition-colors ${
            leftSelected ? 'bg-primary text-white' : 'bg-surface text-primary'
          }`}
        >
          <span className="lifestyle-badge-pulse rounded-full" style={{ animationDelay: `${badgeDelay}s` }}>
            <LifestyleIcon name={pair.leftIconWeb} size={18} />
          </span>
          {pair.leftOptionLabel}
        </button>
        <button
          type="button"
          onClick={() => onChange(pair.rightOptionKey)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium transition-colors ${
            rightSelected ? 'bg-primary text-white' : 'bg-surface text-primary'
          }`}
        >
          <span className="lifestyle-badge-pulse rounded-full" style={{ animationDelay: `${badgeDelay + 0.4}s` }}>
            <LifestyleIcon name={pair.rightIconWeb} size={18} />
          </span>
          {pair.rightOptionLabel}
        </button>
      </div>
    </div>
  );
}

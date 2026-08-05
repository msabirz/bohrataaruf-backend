'use client';

import React from 'react';
import { DynamicIcon, dynamicIconImports } from 'lucide-react/dynamic';
import type { LucideProps } from 'lucide-react';
import { TeaCupIcon } from '@/components/icons/TeaCupIcon';

// Custom icons for gaps in lucide's set (e.g. no tea/chai icon exists).
// Admin-entered icon names use a "custom:<key>" prefix to opt into this map
// instead of a lucide lookup.
const CUSTOM_ICONS: Record<string, React.ComponentType<LucideProps>> = {
  teacup: TeaCupIcon,
};

// Icon names are admin-entered free text (copied from lucide.dev's icon
// list) — not guaranteed to exist. Falls back to a generic circle rather
// than crashing or rendering nothing for a typo/unsupported name.
export function LifestyleIcon({ name, ...props }: { name: string } & LucideProps) {
  if (name.startsWith('custom:')) {
    const Custom = CUSTOM_ICONS[name.slice('custom:'.length)];
    return Custom ? <Custom {...props} /> : <DynamicIcon name="circle" {...props} />;
  }
  if (name in dynamicIconImports) {
    return <DynamicIcon name={name as keyof typeof dynamicIconImports} {...props} />;
  }
  return <DynamicIcon name="circle" {...props} />;
}

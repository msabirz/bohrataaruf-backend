'use client';

import React from 'react';
import { useModeContext } from '@/lib/context/ModeContext';
import PreLaunchPage from './PreLaunchPage';

export function MarketingModeGate({ children }: { children: React.ReactNode }) {
  const { mode, isLoading } = useModeContext();

  // Avoid a flash of the wrong content while the mode is being read.
  if (isLoading || mode === null) return null;

  if (mode === 'B') return <PreLaunchPage />;

  return <>{children}</>;
}

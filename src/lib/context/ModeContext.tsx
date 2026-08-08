'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type SiteMode = 'A' | 'B';

interface ModeContextValue {
  mode: SiteMode | null;
  isLoading: boolean;
}

const ModeContext = createContext<ModeContextValue>({ mode: null, isLoading: true });

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<SiteMode | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/app/mode')
      .then((res) => res.json())
      .then((data) => {
        setMode(data.mode === 'A' ? 'A' : 'B');
      })
      .catch(() => {
        // Fail closed to the pre-launch experience if the mode can't be read.
        setMode('B');
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <ModeContext.Provider value={{ mode, isLoading }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useModeContext() {
  return useContext(ModeContext);
}

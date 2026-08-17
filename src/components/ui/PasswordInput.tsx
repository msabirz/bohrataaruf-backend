'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  wrapperClassName?: string;
}

// Drop-in replacement for <input type="password">, styled identically via
// the same `className` prop callers already pass — just adds a show/hide
// eye toggle. `wrapperClassName` only matters when the input's own
// className relies on flex-child sizing (e.g. `flex-1` inside a flex row);
// that class belongs on the wrapper, not the input, once the input is
// wrapped in a relatively-positioned container for the icon overlay.
export function PasswordInput({ className = '', wrapperClassName = 'relative', ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={wrapperClassName}>
      <input
        type={visible ? 'text' : 'password'}
        className={`${className} pr-10`}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

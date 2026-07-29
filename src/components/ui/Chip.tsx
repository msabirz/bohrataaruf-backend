import React from 'react';

interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function Chip({ label, selected = false, onClick, disabled = false, className = '' }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
        selected 
          ? 'border-accent bg-accent-light text-primary' 
          : 'border-border bg-surface text-muted hover:border-accent hover:text-foreground'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {label}
    </button>
  );
}

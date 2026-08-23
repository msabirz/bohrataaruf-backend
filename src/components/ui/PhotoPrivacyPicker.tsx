import React from 'react';

export type PhotoPrivacyMode = 'always' | 'three_then_request' | 'request_only' | 'blur_until_match';

export const PHOTO_PRIVACY_MODE_LABELS: Record<PhotoPrivacyMode, { label: string; description: string }> = {
  always: { label: 'Show my photo', description: 'Always visible to everyone, no blur' },
  three_then_request: { label: 'Show 3 times, then allow request', description: 'Free peeks first, then viewers can ask for more' },
  request_only: { label: 'Show only on request', description: 'Every view must be requested and approved by you' },
  blur_until_match: { label: 'Blur until match', description: 'Photo stays blurred until you mutually match' },
};

interface PhotoPrivacyPickerProps {
  value: PhotoPrivacyMode | null;
  onChange: (mode: PhotoPrivacyMode) => void;
  allowedModes: PhotoPrivacyMode[];
  disabled?: boolean;
}

export function PhotoPrivacyPicker({ value, onChange, allowedModes, disabled = false }: PhotoPrivacyPickerProps) {
  return (
    <div className="space-y-3">
      {allowedModes.map((mode) => (
        <label
          key={mode}
          className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
            value === mode ? 'border-primary bg-accent-light/20' : 'border-border hover:bg-background'
          } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <input
            type="radio"
            name="photoPrivacyMode"
            checked={value === mode}
            onChange={() => onChange(mode)}
            disabled={disabled}
            className="mt-1"
          />
          <div>
            <p className="text-sm font-medium text-foreground">{PHOTO_PRIVACY_MODE_LABELS[mode].label}</p>
            <p className="text-xs text-muted">{PHOTO_PRIVACY_MODE_LABELS[mode].description}</p>
          </div>
        </label>
      ))}
    </div>
  );
}

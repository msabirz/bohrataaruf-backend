'use client';

import React from 'react';
import { Range, getTrackBackground } from 'react-range';

interface WebRangeSliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  values: number[]; // 1 element = single-thumb, 2 = dual-thumb range
  onChange: (values: number[]) => void;
  unit?: string;
  // Sitting at an extreme means "and beyond" (or "and below" for the
  // bottom of a 2-thumb range) rather than a hard cap. Independently
  // controllable per side — e.g. age's floor is a real hard minimum, so
  // only its top should read "+".
  openEndedMin?: boolean;
  openEndedMax?: boolean;
  // Override the default "<value><unit>" formatting entirely (e.g. for
  // feet/inches display where the raw value is stored in cm).
  formatValueOverride?: (value: number, bound: 'min' | 'max', atExtreme: boolean) => string;
  disabled?: boolean;
  // Called on click while disabled, instead of the normal slider
  // interaction — e.g. to prompt for a permission the slider needs.
  onDisabledClick?: () => void;
}

function defaultFormatValue(value: number, bound: 'min' | 'max', atExtreme: boolean, openEnded: boolean, unit: string): string {
  if (atExtreme && openEnded) {
    return bound === 'max' ? `${value}+${unit}` : `<${value}${unit}`;
  }
  return `${value}${unit}`;
}

export function WebRangeSlider({ label, min, max, step = 1, values, onChange, unit = '', openEndedMin = true, openEndedMax = true, formatValueOverride, disabled = false, onDisabledClick }: WebRangeSliderProps) {
  const isRange = values.length === 2;
  const lowValue = values[0];
  const highValue = values[isRange ? 1 : 0];

  const format = (value: number, bound: 'min' | 'max', atExtreme: boolean) =>
    formatValueOverride
      ? formatValueOverride(value, bound, atExtreme)
      : defaultFormatValue(value, bound, atExtreme, bound === 'min' ? openEndedMin : openEndedMax, unit);

  const rangeText = isRange
    ? `${format(lowValue, 'min', lowValue <= min)} – ${format(highValue, 'max', highValue >= max)}`
    : format(lowValue, 'max', lowValue >= max);

  return (
    <div className={disabled ? 'opacity-50' : ''}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wide text-foreground">{label}</span>
        <span className="text-sm font-semibold text-primary">{disabled ? 'Click to enable' : rangeText}</span>
      </div>
      <div className="px-1">
        {disabled ? (
          // Static placeholder instead of the real (disabled) Range — click
          // handling on a disabled interactive slider is unreliable across
          // browsers/pointer setups, a plain clickable div is unambiguous.
          <button
            type="button"
            onClick={onDisabledClick}
            disabled={!onDisabledClick}
            className="w-full h-5 flex items-center cursor-pointer"
            aria-label={`${label} — click to enable`}
          >
            <div className="relative w-full h-1 rounded-full bg-border">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-surface border-2 border-muted shadow-sm" />
            </div>
          </button>
        ) : (
          <Range
            values={values}
            min={min}
            max={max}
            step={step}
            onChange={onChange}
            renderTrack={({ props, children }) => (
              <div
                {...props}
                style={{
                  ...props.style,
                  height: 4,
                  width: '100%',
                  borderRadius: 999,
                  // getTrackBackground requires colors.length === values.length + 1.
                  // Single-thumb sliders are modeled as a 2-value range ([min, current])
                  // so they need 3 colors too, not 2 — passing only 2 silently produces
                  // an `undefined` color stop, which invalidates the whole gradient string
                  // and makes the browser drop the background entirely (invisible track).
                  background: getTrackBackground({ values: isRange ? values : [min, ...values], colors: ['#E5E0D8', '#8C6A3F', '#E5E0D8'], min, max }),
                }}
              >
                {children}
              </div>
            )}
            renderThumb={({ props }) => (
              <div
                {...props}
                key={props.key}
                style={{
                  ...props.style,
                  height: 20,
                  width: 20,
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFC',
                  border: '2px solid #8C6A3F',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }}
              />
            )}
          />
        )}
      </div>
    </div>
  );
}

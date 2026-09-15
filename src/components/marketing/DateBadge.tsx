import React from 'react';

// The month/day "ticket stub" chip used on both the Events hub cards and
// the program detail hero — the one glanceable date affordance real event
// listings use (Luma/Eventbrite-style), instead of burying the date in a
// line of small text.
export function DateBadge({ date, size = 'md' }: { date: string; size?: 'md' | 'lg' }) {
  const d = new Date(date);
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = d.toLocaleDateString('en-US', { day: 'numeric' });

  const dims = size === 'lg' ? 'w-20 h-20' : 'w-14 h-14';
  const monthSize = size === 'lg' ? 'text-xs' : 'text-[10px]';
  const daySize = size === 'lg' ? 'text-3xl' : 'text-xl';

  return (
    <div className={`${dims} shrink-0 rounded-xl bg-primary text-surface flex flex-col items-center justify-center leading-none shadow-sm`}>
      <span className={`${monthSize} font-semibold tracking-wider opacity-80`}>{month}</span>
      <span className={`${daySize} font-bold mt-0.5`}>{day}</span>
    </div>
  );
}

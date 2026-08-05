import React from 'react';

// Neither Feather nor lucide ship a tea/chai icon (confirmed by checking
// both icon sets directly). Hand-built to match lucide's own stroke
// conventions (24x24, stroke="currentColor", strokeWidth=2, round
// caps/joins — see node_modules/lucide-react/dist/esm/icons/coffee.mjs)
// so it sits seamlessly next to real lucide icons. The hanging tag+string
// is the visual cue that reads as "tea" rather than reusing coffee's mug.
export function TeaCupIcon({
  size = 24,
  strokeWidth = 2,
  color = 'currentColor',
  ...props
}: React.SVGProps<SVGSVGElement> & { size?: string | number; strokeWidth?: string | number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 10h12v4a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-4Z" />
      <path d="M16 11h1a2 2 0 0 1 0 4h-1" />
      <path d="M2 20h20" />
      <path d="M9.5 3v2" />
      <rect x="8" y="1" width="3" height="2" rx="0.5" />
    </svg>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
// @ts-ignore
import India from '@svg-maps/india';

type StateData = {
  hasPresence: boolean;
  count?: number;
};

export default function IndiaMap() {
  const [distribution, setDistribution] = useState<Record<string, StateData>>({});
  const [hoveredState, setHoveredState] = useState<{ id: string; name: string; x: number; y: number } | null>(null);

  useEffect(() => {
    fetch('/api/marketing/member-distribution')
      .then((res) => res.json())
      .then((data) => {
        if (data.distribution) setDistribution(data.distribution);
      })
      .catch((err) => console.error('Failed to load map data:', err));
  }, []);

  return (
    <div className="relative w-full max-w-md mx-auto">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={India.viewBox}
        className="w-full h-auto drop-shadow-xl"
        onMouseLeave={() => setHoveredState(null)}
      >
        {India.locations.map((location: any) => {
          // The ID from @svg-maps/india is just the 2-letter code in lowercase (e.g. "mh").
          // Our API returns uppercase 2-letter ISO codes ("MH").
          const stateCode = location.id.toUpperCase();
          const data = distribution[stateCode];

          // We use the primary bronze color (#8C6A3F) for presence, and a muted neutral for none.
          const fill = data?.hasPresence ? '#8C6A3F' : '#E5E0D8';

          return (
            <path
              key={location.id}
              id={location.id}
              name={location.name}
              d={location.path}
              fill={fill}
              className={`transition-colors duration-300 stroke-surface stroke-[0.5] ${data?.hasPresence ? 'hover:fill-accent cursor-pointer' : ''}`}
              onMouseMove={(e) => {
                if (data?.hasPresence) {
                  // Get bounding box of SVG to calculate relative tooltip position
                  const svgRect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                  if (svgRect) {
                    setHoveredState({
                      id: stateCode,
                      name: location.name,
                      x: e.clientX - svgRect.left,
                      y: e.clientY - svgRect.top,
                    });
                  }
                }
              }}
              onMouseLeave={() => {
                // Let the parent SVG's onMouseLeave handle clearing the tooltip
                // to prevent flickering when moving between adjacent states
              }}
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredState && distribution[hoveredState.id] && (
        <div
          className="absolute pointer-events-none z-10 bg-text text-surface text-sm font-medium px-3 py-1.5 rounded-lg shadow-lg"
          style={{
            left: hoveredState.x,
            top: hoveredState.y,
            transform: 'translate(-50%, -120%)',
          }}
        >
          {hoveredState.name}: {distribution[hoveredState.id].count ? `${distribution[hoveredState.id].count} members` : 'Members here'}
          {/* Tooltip Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-text" />
        </div>
      )}
    </div>
  );
}

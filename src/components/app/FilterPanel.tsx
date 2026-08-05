'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { WebRangeSlider } from './WebRangeSlider';

// Mirrors BohraTaaruf/src/app/(tabs)/search.tsx's bounds/options exactly —
// keep both in sync if either changes.
export const AGE_MIN = 18;
export const AGE_MAX = 60;
export const HEIGHT_MIN = 140;
export const HEIGHT_MAX = 210;
export const RADIUS_MIN = 5;
export const RADIUS_MAX = 100; // sitting at max = "Any" (no distance filtering)

// Height is stored/sent in cm (backend contract) but always displayed in
// feet/inches to match the mobile app.
function cmToFeetInches(cm: number): string {
  const totalInches = Math.round(cm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}"`;
}

function formatHeightSliderValue(value: number, bound: 'min' | 'max', atExtreme: boolean): string {
  const label = cmToFeetInches(value);
  if (atExtreme) return bound === 'max' ? `${label}+` : `<${label}`;
  return label;
}

const EDUCATION_OPTIONS = ['Graduate', 'Post-Graduate', 'Professional (CA/MBBS/etc.)'];
const CITY_OPTIONS = ['Mumbai', 'Surat', 'Ahmedabad', 'Pune', 'Indore', 'Bangalore'];
const PROFESSION_OPTIONS = ['Doctor', 'Engineer', 'Business', 'Teacher', 'CA', 'Other professional'];
const PRACTICE_OPTIONS = [
  { label: 'Any', value: '' },
  { label: 'Very Devout', value: 'very_devout' },
  { label: 'Practicing', value: 'practicing' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Flexible', value: 'flexible' },
];

export interface FilterState {
  ageRange: [number, number];
  heightRange: [number, number];
  radiusKm: number;
  cities: string[];
  education: string[];
  professions: string[];
  practiceLevel: string;
}

export const DEFAULT_FILTERS: FilterState = {
  ageRange: [AGE_MIN, AGE_MAX],
  heightRange: [HEIGHT_MIN, HEIGHT_MAX],
  radiusKm: RADIUS_MAX,
  cities: [],
  education: [],
  professions: [],
  practiceLevel: '',
};

// Converts panel state into the exact shape the backend expects — an
// extreme slider position means "no bound" (open-ended), matching
// resolvePhotoAccess-adjacent conventions used elsewhere in this app.
export function buildFilterPayload(f: FilterState) {
  return {
    ageMin: f.ageRange[0] > AGE_MIN ? f.ageRange[0] : undefined,
    ageMax: f.ageRange[1] < AGE_MAX ? f.ageRange[1] : undefined,
    heightMin: f.heightRange[0] > HEIGHT_MIN ? f.heightRange[0] : undefined,
    heightMax: f.heightRange[1] < HEIGHT_MAX ? f.heightRange[1] : undefined,
    radiusKm: f.radiusKm < RADIUS_MAX ? f.radiusKm : undefined,
    preferredCities: f.cities,
    preferredEducation: f.education,
    preferredProfessions: f.professions,
    practiceLevel: f.practiceLevel || undefined,
  };
}

function toggleInList(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
}

function ChipButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
        selected ? 'bg-primary text-surface border-primary' : 'bg-surface text-foreground border-border hover:bg-background'
      }`}
    >
      {label}
    </button>
  );
}

export function FilterPanel({
  visible,
  onClose,
  onApply,
  initialFilters,
}: {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters: FilterState;
}) {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  // Defaults true so the radius slider doesn't flash disabled before the
  // first profile check lands (mirrors the mobile app's same convention).
  const [viewerHasLocation, setViewerHasLocation] = useState(true);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);

  // Re-sync local draft whenever the panel is (re)opened, so a close-without-
  // applying doesn't leave stale edits the next time it's opened.
  useEffect(() => {
    if (visible) setFilters(initialFilters);
  }, [visible, initialFilters]);

  useEffect(() => {
    if (!visible) return;
    fetch('/api/v1/profile')
      .then((r) => r.json())
      .then((d) => setViewerHasLocation(d.latitude != null && d.longitude != null))
      .catch(() => {});
  }, [visible]);

  if (!visible) return null;

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleClearAll = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // Clicking the disabled radius slider prompts for the browser's location
  // permission right there, rather than leaving it inert. On success,
  // persists it via the same backend endpoint mobile's onboarding/edit-profile
  // location save uses (POST /profile/basics already accepts a lat/long-only
  // partial update, independent of any other field).
  const requestBrowserLocation = () => {
    if (isRequestingLocation || !navigator.geolocation) return;
    setIsRequestingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await fetch('/api/v1/profile/basics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });
          setViewerHasLocation(true);
        } finally {
          setIsRequestingLocation(false);
        }
      },
      () => {
        setIsRequestingLocation(false);
        alert('Location access was denied. Enable it in your browser settings to filter by distance.');
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-end bg-foreground/30 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-md h-full shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-surface z-10">
          <h2 className="text-lg font-bold text-foreground">Search Filters</h2>
          <div className="flex items-center gap-4">
            <button onClick={handleClearAll} className="text-sm font-semibold text-primary">Clear All</button>
            <button onClick={onClose} className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-background transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          <WebRangeSlider
            label="Age Range"
            min={AGE_MIN}
            max={AGE_MAX}
            values={filters.ageRange}
            onChange={(v) => setFilters((f) => ({ ...f, ageRange: [v[0], v[1]] }))}
            unit=" yrs"
            // 18 is a hard floor (no one younger exists in the system) —
            // only the top end is open-ended ("60+").
            openEndedMin={false}
          />

          <WebRangeSlider
            label="Height Range"
            min={HEIGHT_MIN}
            max={HEIGHT_MAX}
            values={filters.heightRange}
            onChange={(v) => setFilters((f) => ({ ...f, heightRange: [v[0], v[1]] }))}
            formatValueOverride={formatHeightSliderValue}
          />

          <WebRangeSlider
            label="Within Distance"
            min={RADIUS_MIN}
            max={RADIUS_MAX}
            values={[filters.radiusKm]}
            onChange={(v) => setFilters((f) => ({ ...f, radiusKm: v[0] }))}
            unit=" km"
            disabled={!viewerHasLocation}
            onDisabledClick={requestBrowserLocation}
          />
          {!viewerHasLocation && (
            <p className="text-xs text-muted -mt-6 mb-2">
              {isRequestingLocation ? 'Requesting location access…' : 'Click the slider to enable — this filter needs your location.'}
            </p>
          )}

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-foreground mb-3">Education</p>
            <div className="flex flex-wrap gap-2">
              {EDUCATION_OPTIONS.map((edu) => (
                <ChipButton key={edu} label={edu} selected={filters.education.includes(edu)} onPress={() => setFilters((f) => ({ ...f, education: toggleInList(f.education, edu) }))} />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-foreground mb-3">Profession</p>
            <div className="flex flex-wrap gap-2">
              {PROFESSION_OPTIONS.map((prof) => (
                <ChipButton key={prof} label={prof} selected={filters.professions.includes(prof)} onPress={() => setFilters((f) => ({ ...f, professions: toggleInList(f.professions, prof) }))} />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-foreground mb-3">Cities</p>
            <div className="flex flex-wrap gap-2">
              {CITY_OPTIONS.map((city) => (
                <ChipButton key={city} label={city} selected={filters.cities.includes(city)} onPress={() => setFilters((f) => ({ ...f, cities: toggleInList(f.cities, city) }))} />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-foreground mb-3">Religious Practice</p>
            <div className="flex flex-wrap gap-2">
              {PRACTICE_OPTIONS.map((prac) => (
                <ChipButton key={prac.value} label={prac.label} selected={filters.practiceLevel === prac.value} onPress={() => setFilters((f) => ({ ...f, practiceLevel: prac.value }))} />
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-surface border-t border-border p-6">
          <button
            onClick={handleApply}
            className="w-full bg-primary text-surface font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}

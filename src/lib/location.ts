// Web port of the mobile app's onboarding location capture
// (BohraTaaruf/src/lib/location/getOnboardingLocation.ts) — same
// best-effort, never-block contract: permission denied or any failure
// just means the caller proceeds without a value, never throws.

export interface OnboardingLocation {
  latitude: number;
  longitude: number;
  // Best-effort reverse-geocoded city name, or null if unavailable/failed.
  city: string | null;
}

export async function getOnboardingLocation(): Promise<OnboardingLocation | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;

  const coords = await new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null), // denied or unavailable — never blocks onboarding
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
  });
  if (!coords) return null;

  let city: string | null = null;
  try {
    const res = await fetch(`/api/v1/geo/reverse-geocode?lat=${coords.latitude}&lon=${coords.longitude}`);
    if (res.ok) {
      const data = await res.json();
      city = data.city ?? null;
    }
  } catch (err) {
    // Best-effort — losing the city name must never lose the coordinates.
    console.warn('[location] Reverse geocoding failed:', err);
  }

  return { ...coords, city };
}

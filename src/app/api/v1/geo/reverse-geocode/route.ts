import { NextResponse } from 'next/server';

// Server-side proxy for OpenStreetMap Nominatim — reverse geocoding needs a
// real identifying User-Agent (their usage policy flags/blocks anonymous
// browser-origin requests), so this can't be called directly from the
// client. No API key required, no new env var.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=10`,
      { headers: { 'User-Agent': 'BohraTaaruf/1.0 (support@bohrataaruf.com)' } },
    );
    if (!res.ok) return NextResponse.json({ city: null });

    const data = await res.json();
    const city = data?.address?.city || data?.address?.town || data?.address?.village || data?.address?.county || null;
    return NextResponse.json({ city });
  } catch (err) {
    console.warn('[geo] reverse geocode failed:', err);
    return NextResponse.json({ city: null });
  }
}

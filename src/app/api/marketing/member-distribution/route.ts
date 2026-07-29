import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { isNotNull, eq } from 'drizzle-orm';

// Cache for 1 hour (3600 seconds) to prevent DB spam on marketing page loads
export const revalidate = 3600; 

// A robust allow-list mapping Indian cities to their 2-letter ISO state codes.
// This natively filters out fictional/QA data (like "test" or empty strings)
// since they won't match a valid dictionary entry.
const CITY_TO_STATE: Record<string, string> = {
  'mumbai': 'MH',
  'pune': 'MH',
  'nagpur': 'MH',
  'thane': 'MH',
  'nashik': 'MH',
  'aurangabad': 'MH',
  'bhopal': 'MP',
  'itarsi': 'MP',
  'burhanpur': 'MP',
  'indore': 'MP',
  'ujjain': 'MP',
  'bengaluru': 'KA',
  'bangalore': 'KA',
  'mysuru': 'KA',
  'mysore': 'KA',
  'durg': 'CT',
  'raipur': 'CT',
  'goa': 'GA',
  'panaji': 'GA',
  'surat': 'GJ',
  'rajkot': 'GJ',
  'ahmedabad': 'GJ',
  'vadodara': 'GJ',
  'gujrat': 'GJ', // handling common user typo
  'gujarat': 'GJ',
  'chennai': 'TN',
  'coimbatore': 'TN',
  'madurai': 'TN',
  'delhi': 'DL',
  'new delhi': 'DL',
  'hyderabad': 'TG',
  'kolkata': 'WB',
  'jaipur': 'RJ',
  'udaipur': 'RJ',
  'lucknow': 'UP',
  'kanpur': 'UP',
  'patna': 'BR',
};

export async function GET() {
  try {
    // Only count active users
    const allUsers = await db
      .select({ city: users.city })
      .from(users)
      .where(eq(users.isActive, true));
    
    const stateCounts: Record<string, number> = {};
    const unmappedCities = new Set<string>();

    for (const u of allUsers) {
      if (!u.city) continue;
      const normalizedCity = u.city.trim().toLowerCase();
      if (!normalizedCity) continue;

      const stateCode = CITY_TO_STATE[normalizedCity];
      if (stateCode) {
        stateCounts[stateCode] = (stateCounts[stateCode] || 0) + 1;
      } else {
        // Track unmapped cities in memory.
        // This is safe because fictional strings ("asdf") just get logged and ignored,
        // while real new cities ("kochi") can be spotted by devs in logs and added to the dictionary.
        unmappedCities.add(normalizedCity);
      }
    }

    if (unmappedCities.size > 0) {
      // VISIBILITY LOGGING: Output to server logs so admins can periodically review
      // and add genuinely new real cities to the CITY_TO_STATE dictionary.
      console.warn('[MemberDistribution] Unmapped cities discovered (review for dictionary addition):', Array.from(unmappedCities));
    }

    // Apply PRIVACY SAFEGUARD threshold
    const result: Record<string, { hasPresence: boolean; count?: number }> = {};
    for (const [state, count] of Object.entries(stateCounts)) {
      if (count < 5) {
        result[state] = { hasPresence: true }; // Hide exact tiny numbers
      } else {
        result[state] = { hasPresence: true, count };
      }
    }

    return NextResponse.json({ distribution: result });
  } catch (error) {
    console.error('Member distribution error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

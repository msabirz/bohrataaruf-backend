import { NextResponse } from 'next/server';
import { db, executeQuery } from '@/lib/db';
import { sql, eq, inArray } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { serializeInterestedProfile } from '@/lib/api/serialize';
import { preferences } from '@/lib/db/schema';

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const myPrefs = await db.select().from(preferences).where(eq(preferences.userId, userId)).limit(1).then(res => res[0]);

    // Fetch profiles who I have declined (user_id = userId, action = 'declined')
    // We join with the target profile (the person who originally liked me).
    const query = sql`
      SELECT 
        u.id, p.alias, p.photo_key as "photoUri", p.photo_key_blurred as "photoUriBlurred", u.city, p.profession, p.education, p.bio_text as "bio", p.intro_line as "introLine",
        u.date_of_birth as "dob",
        i.created_at as "interestedAt"
      FROM interactions i
      JOIN users u ON u.id = i.target_id
      JOIN profiles p ON p.user_id = u.id
      WHERE i.user_id = ${userId}
        AND i.action = 'declined'
      ORDER BY i.created_at DESC
    `;

    const results = await executeQuery(query);

    let profilesList: any[] = [];
    if (results.length > 0) {
      const candidateIds = results.map((r: any) => r.id);
      const allPrefs = await db.select().from(preferences).where(inArray(preferences.userId, candidateIds));
      
      profilesList = await Promise.all(results.map(async (row: any) => {
        const candidatePrefs = allPrefs.find(p => p.userId === row.id);
        return {
          ...(await serializeInterestedProfile(row, myPrefs, candidatePrefs)),
          interestedAt: new Date(row.interestedAt).toISOString(),
        };
      }));
    }

    return NextResponse.json({ profilesList });
  } catch (error) {
    console.error('Get declined requests error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

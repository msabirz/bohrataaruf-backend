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

    // Fetch profiles who liked me (target_id = userId, action = 'interested')
    // AND I have not declined them (no row where user_id = userId, target_id = them, action = 'declined')
    // AND we are not matched (no matches row)
    const query = sql`
      SELECT 
        u.id, p.alias, p.photo_key as "photoUri", u.city, p.profession, p.education, p.bio_text as "bio", p.intro_line as "introLine",
        u.date_of_birth as "dob",
        i.created_at as "interestedAt"
      FROM interactions i
      JOIN users u ON u.id = i.user_id
      JOIN profiles p ON p.user_id = u.id
      WHERE i.target_id = ${userId}
        AND i.action = 'interested'
        AND NOT EXISTS (
          SELECT 1 FROM interactions my_i 
          WHERE my_i.user_id = ${userId} 
            AND my_i.target_id = u.id 
            AND my_i.action = 'declined'
        )
        AND NOT EXISTS (
          SELECT 1 FROM matches m 
          WHERE (m.user_a = ${userId} AND m.user_b = u.id) 
             OR (m.user_a = u.id AND m.user_b = ${userId})
        )
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
    console.error('Get received interests error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

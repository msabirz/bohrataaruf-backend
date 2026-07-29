import { NextResponse } from 'next/server';
import { db, executeQuery } from '@/lib/db';
import { sql, eq, inArray } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { serializeMutualMatch } from '@/lib/api/serialize';
import { preferences } from '@/lib/db/schema';

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const myPrefs = await db.select().from(preferences).where(eq(preferences.userId, userId)).limit(1).then(res => res[0]);

    const query = sql`
      SELECT 
        m.*,
        u.id as other_user_id, u.name as other_name, u.city as other_city, u.date_of_birth as other_dob,
        p.alias as other_alias, p.photo_key as other_photo, p.bio_text as other_bio, p.education as other_education, p.profession as other_profession
      FROM matches m
      JOIN users u ON (CASE WHEN m.user_a = ${userId} THEN m.user_b ELSE m.user_a END) = u.id
      JOIN profiles p ON u.id = p.user_id
      WHERE m.user_a = ${userId} OR m.user_b = ${userId}
      ORDER BY m.matched_at DESC
    `;
    
    const results = await executeQuery(query);

    let matchesList: any[] = [];
    if (results.length > 0) {
      const candidateIds = results.map((r: any) => r.other_user_id);
      const allPrefs = await db.select().from(preferences).where(inArray(preferences.userId, candidateIds));
      
      matchesList = await Promise.all(results.map(async (row: any) => {
        // Mock db objects to pass to our serializer
        const dbMatch = {
          id: row.id,
          user_a: row.user_a,
          user_b: row.user_b,
          matched_at: row.matched_at,
          handoff_a_status: row.handoff_a_status,
          handoff_a_handles: row.handoff_a_handles,
          handoff_b_status: row.handoff_b_status,
          handoff_b_handles: row.handoff_b_handles,
          suggested_opener: row.suggested_opener,
        };

        const otherUser = {
          id: row.other_user_id,
          name: row.other_name,
          city: row.other_city,
          date_of_birth: row.other_dob,
        };

        const otherProfile = {
          alias: row.other_alias,
          photoKey: row.other_photo,
          bio_text: row.other_bio,
          education: row.other_education,
          profession: row.other_profession,
        };

        const candidatePrefs = allPrefs.find(p => p.userId === row.other_user_id);
        return await serializeMutualMatch(dbMatch, otherUser, otherProfile, userId, myPrefs, candidatePrefs);
      }));
    }

    return NextResponse.json({ matches: matchesList });
  } catch (error) {
    console.error('Get active matches error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

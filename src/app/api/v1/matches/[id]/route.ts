import { NextResponse } from 'next/server';
import { db, executeQuery } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { fetchRichCandidateProfile } from '@/lib/db/profileQueries';
import { getViewUrl } from '@/lib/storage';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: matchId } = await params;

    const query = sql`
      SELECT 
        m.*,
        u.id as other_user_id, u.name as other_name,
        p.photo_key as other_photo
      FROM matches m
      JOIN users u ON (CASE WHEN m.user_a = ${userId} THEN m.user_b ELSE m.user_a END) = u.id
      JOIN profiles p ON u.id = p.user_id
      WHERE m.id = ${matchId} AND (m.user_a = ${userId} OR m.user_b = ${userId})
      LIMIT 1
    `;
    
    const row = await executeQuery(query).then(res => res[0] as any);

    if (!row) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const otherUserId = row.other_user_id;

    // 1. Fetch base rich profile
    const richProfile = await fetchRichCandidateProfile(userId, otherUserId);
    if (!richProfile) {
      return NextResponse.json({ error: 'Matched profile data missing' }, { status: 404 });
    }

    // 2. Determine handoff logic
    const amUserA = row.user_a === userId;
    const myStatus = amUserA ? row.handoff_a_status : row.handoff_b_status;
    const theirStatus = amUserA ? row.handoff_b_status : row.handoff_a_status;
    
    const myHandles = amUserA ? row.handoff_a_handles : row.handoff_b_handles;
    const theirHandles = amUserA ? row.handoff_b_handles : row.handoff_a_handles;

    let handoffStatus = 'action_required';
    if (myStatus === 'shared' && theirStatus === 'shared') {
      handoffStatus = 'complete';
    } else if (myStatus === 'shared') {
      handoffStatus = 'waiting_on_them';
    } else if (theirStatus === 'shared') {
      handoffStatus = 'waiting_on_me';
    }

    // 3. Merge explicitly
    const mutualMatchResponse = {
      ...richProfile,
      matchId: row.id,
      profileId: otherUserId,
      realName: row.other_name,
      realPhotoUri: await getViewUrl(row.other_photo),
      photoUri: await getViewUrl(row.other_photo), // Unblurred override
      matchedAt: new Date(row.matched_at).toISOString(),
      handoffStatus,
      platformsSharedByMe: myHandles ? Object.keys(myHandles) : [],
      platformsSharedByThem: theirHandles ? Object.keys(theirHandles) : [],
      theirHandles: handoffStatus === 'complete' ? theirHandles : undefined,
    };

    return NextResponse.json(mutualMatchResponse);
  } catch (error) {
    console.error('Get match detail error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

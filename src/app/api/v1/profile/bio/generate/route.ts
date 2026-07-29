import { NextResponse } from 'next/server';
import { GenerateBioSchema } from '@/lib/api/validators';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { db } from '@/lib/db';
import { users, profiles, preferences, bioChunks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateUniqueAlias } from '@/lib/alias-generator';

function fillWildcards(template: string, userData: any): string | null {
  let filled = template;
  const matches = [...template.matchAll(/\*_([A-Z_]+)_\*/g)];
  
  for (const match of matches) {
    const key = match[1];
    let val = '';
    if (key === 'NAME') val = userData.name;
    else if (key === 'PROFESSION') val = userData.profession;
    else if (key === 'CITY') val = userData.city;
    else if (key === 'EDUCATION') val = userData.education;
    
    // If a required wildcard value is missing/empty, we cannot use this chunk
    if (!val || val.trim() === '') {
      return null; 
    }
    
    filled = filled.replace(match[0], val);
  }
  return filled;
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = GenerateBioSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    // 1. Fetch user data
    const userRow = await db.select().from(users).where(eq(users.id, userId)).limit(1).then(res => res[0]);
    if (!userRow) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let profileRow = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1).then(res => res[0]);
    if (!profileRow) {
      const gender = (userRow.gender || 'male') as 'male' | 'female';
      let alias = `New ${Math.floor(100000 + Math.random() * 900000)}`;
      try { alias = await generateUniqueAlias(gender); } catch {}
      await db.insert(profiles).values({ userId, alias });
      profileRow = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1).then(res => res[0]);
    }

    const prefsRow = await db.select().from(preferences).where(eq(preferences.userId, userId)).limit(1).then(res => res[0]);
    if (!prefsRow) {
      await db.insert(preferences).values({ userId });
    }

    if (!profileRow) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const userData = {
      name: profileRow.alias,
      profession: profileRow.profession,
      city: userRow.city,
      education: profileRow.education,
    };

    // 2. Fetch all English chunks (Note: English-only until gu/ur content is written)
    const allChunks = await db.select().from(bioChunks).where(eq(bioChunks.language, 'en'));

    // Helper to get valid filled chunks for a specific condition
    const getValidChunks = (type: string, condition: string | null = null) => {
      const filtered = allChunks.filter(c => 
        c.chunkType === type && 
        (condition === null || c.conditionKey === condition)
      );
      
      const filled = [];
      for (const c of filtered) {
        const text = fillWildcards(c.templateText, userData);
        if (text !== null) filled.push(text);
      }
      return filled; // Already effectively randomized if we use rotation below, though DB order is stable
    };

    // Prepare pools
    const openings = getValidChunks('opening');
    const professions = getValidChunks('profession');
    const closings = getValidChunks('closing');
    
    const familyPool = prefsRow?.familyExpectation 
      ? getValidChunks('family', `family_expectation:${prefsRow.familyExpectation}`) 
      : [];

    const pTags = prefsRow?.partnerQualityTags || [];

    const tagMapping: Record<string, string> = {
      "connection & chemistry": "connection",
      "career-driven": "career_oriented",
      "family-oriented": "family_oriented",
      "similar values": "similar_values"
    };

    const candidates = [];

    // 3. Generate 3 distinct candidates
    for (let i = 0; i < 3; i++) {
      const selectedChunks: string[] = [];
      let introLineStr = '';

      // Opening
      const opening = openings.length > 0 ? openings[i % openings.length] : null;
      if (opening) selectedChunks.push(opening);

      // Profession
      const profession = professions.length > 0 ? professions[i % professions.length] : null;
      if (profession) selectedChunks.push(profession);

      // Family
      const family = familyPool.length > 0 ? familyPool[i % familyPool.length] : null;
      if (family) selectedChunks.push(family);

      // Partner Pref
      let partnerPref = null;
      if (pTags.length > 0) {
        const rawTag = pTags[i % pTags.length];
        const targetTag = tagMapping[rawTag] || rawTag;
        const prefPool = getValidChunks('partner_pref', `partner_quality_tags:${targetTag}`);
        if (prefPool.length > 0) {
          partnerPref = prefPool[0]; // just take first valid one for this specific tag
          selectedChunks.push(partnerPref);
        }
      }

      // Closing
      const closing = closings.length > 0 ? closings[i % closings.length] : null;
      if (closing) selectedChunks.push(closing);

      // Assembly
      const bioStr = selectedChunks.join(' ');
      
      const introChunks = [opening, family || partnerPref].filter(Boolean);
      introLineStr = introChunks.join(' ');

      // Fallback if somehow completely empty
      candidates.push({
        bio: bioStr || `Hi, I'm excited to join ${process.env.APP_DISPLAY_NAME ?? 'Bohra Taaruf'}!`,
        introLine: introLineStr || `Hi, I'm excited to join ${process.env.APP_DISPLAY_NAME ?? 'Bohra Taaruf'}!`,
      });
    }

    // Temporary shim removed, we now return exactly what the frontend needs
    return NextResponse.json({ 
      candidates 
    });
  } catch (error) {
    console.error('Generate bio error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

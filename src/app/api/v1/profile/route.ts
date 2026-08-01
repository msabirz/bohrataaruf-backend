import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { db } from '@/lib/db';
import { users, profiles, preferences, verifications } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { serializeProfile, keysToCamelCase } from '@/lib/api/serialize';
import { computeProfileCompletion } from '@/lib/profileCompletion';
import { UpdateProfileSchema } from '@/lib/api/validators';
import { deleteUserAccount } from '@/lib/api/userOps';

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1).then(res => res[0]);
    const profile = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1).then(res => res[0]);
    const prefs = await db.select().from(preferences).where(eq(preferences.userId, userId)).limit(1).then(res => res[0]);
    const verification = await db.select().from(verifications).where(eq(verifications.userId, userId)).limit(1).then(res => res[0]);

    if (!user || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const payload = await serializeProfile(profile, user, prefs);
    if (verification) {
      payload.verification = keysToCamelCase({
        status: verification.status,
        submittedAt: verification.createdAt,
        rejectionReason: verification.rejectionReason,
        itsNumberHash: user.itsNumberHash,
      });
    } else {
      payload.verification = { status: 'none' };
    }

    const completion = computeProfileCompletion(user, profile, prefs, verification);
    payload.completionPercentage = completion.percentage;
    payload.missingCompletionFields = completion.missingFields;
    payload.isProfileComplete = completion.isComplete;

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const parsed = UpdateProfileSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const updates = parsed.data;
    
    // Explicit whitelist: only these exact fields can be updated.
    // Dangerous fields like passwordHash, itsNumberHash, isActive, or id are strictly ignored.
    const userUpdates: any = {};
    if (updates.name !== undefined && updates.name !== null) userUpdates.name = updates.name;
    if (updates.email !== undefined && updates.email !== null) userUpdates.email = updates.email === '' ? null : updates.email;
    if (updates.city !== undefined && updates.city !== null) userUpdates.city = updates.city;
    if (updates.jamaat !== undefined && updates.jamaat !== null) userUpdates.jamaat = updates.jamaat;
    if (updates.preferredLanguage !== undefined && updates.preferredLanguage !== null) userUpdates.preferredLanguage = updates.preferredLanguage;

    if (Object.keys(userUpdates).length > 0) {
      await db.update(users).set(userUpdates).where(eq(users.id, userId));
    }

    const profileUpdates: any = {};
    if (updates.alias !== undefined && updates.alias !== null) {
      const alias = updates.alias.trim();
      if (!alias) {
        return NextResponse.json({ error: 'Alias cannot be empty' }, { status: 400 });
      }
      
      const currentProfile = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1).then(res => res[0]);
      if (currentProfile && currentProfile.alias.toLowerCase() !== alias.toLowerCase()) {
        const existing = await db.select({ userId: profiles.userId }).from(profiles).where(sql`lower(${profiles.alias}) = lower(${alias})`).limit(1);
        if (existing.length > 0) {
          return NextResponse.json({ error: 'This name is already taken, please choose another' }, { status: 400 });
        }
      }
      profileUpdates.alias = alias;
    }
    if (updates.education !== undefined) profileUpdates.education = updates.education;
    if (updates.fieldOfStudy !== undefined) profileUpdates.fieldOfStudy = updates.fieldOfStudy;
    if (updates.profession !== undefined) profileUpdates.profession = updates.profession;
    if (updates.heightCm !== undefined) profileUpdates.heightCm = updates.heightCm;
    if (updates.willingToRelocate !== undefined) profileUpdates.willingToRelocate = updates.willingToRelocate;
    if (updates.maritalStatus !== undefined) profileUpdates.maritalStatus = updates.maritalStatus;
    if (updates.bio !== undefined) profileUpdates.bioText = updates.bio;
    if (updates.introLine !== undefined) profileUpdates.introLine = updates.introLine;
    if (updates.brothersCount !== undefined) profileUpdates.brothersCount = updates.brothersCount;
    if (updates.brothersMarriedCount !== undefined) profileUpdates.brothersMarriedCount = updates.brothersMarriedCount;
    if (updates.sistersCount !== undefined) profileUpdates.sistersCount = updates.sistersCount;
    if (updates.sistersMarriedCount !== undefined) profileUpdates.sistersMarriedCount = updates.sistersMarriedCount;
    if (updates.hasChildren !== undefined) profileUpdates.hasChildren = updates.hasChildren;
    if (updates.childrenCount !== undefined) profileUpdates.childrenCount = updates.childrenCount;
    if (updates.childrenBoysCount !== undefined) profileUpdates.childrenBoysCount = updates.childrenBoysCount;
    if (updates.childrenGirlsCount !== undefined) profileUpdates.childrenGirlsCount = updates.childrenGirlsCount;
    if (updates.childrenLivingStatus !== undefined) profileUpdates.childrenLivingStatus = updates.childrenLivingStatus;

    if (Object.keys(profileUpdates).length > 0) {
      await db.update(profiles).set(profileUpdates).where(eq(profiles.userId, userId));
    }

    // Return the fresh profile
    return await GET(request);
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // Because of onDelete: 'cascade', we can just delete the user.
    await deleteUserAccount(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


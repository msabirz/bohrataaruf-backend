import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { db } from '@/lib/db';
import { users, profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { BasicsSchema, parseDobStrict } from '@/lib/api/validators';
import { generateUniqueAlias } from '@/lib/alias-generator';

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const parsed = BasicsSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;
    
    const userUpdates: any = {};
    if (data.name !== undefined && data.name !== null) userUpdates.name = data.name;
    if (data.dob !== undefined && data.dob !== null) {
      // BasicsSchema's superRefine already guarantees this parses (strict
      // DD/MM/YYYY, not JS's locale-ambiguous Date string constructor) —
      // defensive null-check only, never expected to fire.
      const parsedDob = parseDobStrict(data.dob);
      if (parsedDob) {
        // Build the date-only string from LOCAL getters, not .toISOString()
        // (which converts through UTC) — on a server running ahead of UTC
        // (e.g. IST, UTC+5:30), .toISOString() shifts local midnight back
        // to the previous day, which a `date` column then truncates to,
        // silently storing the wrong day. Reproduced and confirmed via a
        // real DB write during verification of this fix.
        const y = parsedDob.getFullYear();
        const m = String(parsedDob.getMonth() + 1).padStart(2, '0');
        const d = String(parsedDob.getDate()).padStart(2, '0');
        userUpdates.dateOfBirth = `${y}-${m}-${d}`;
      }
    }
    if (data.gender !== undefined && data.gender !== null) userUpdates.gender = data.gender;
    if (data.city !== undefined && data.city !== null) userUpdates.city = data.city;
    if (data.latitude !== undefined) userUpdates.latitude = data.latitude;
    if (data.longitude !== undefined) userUpdates.longitude = data.longitude;
    if (data.email !== undefined && data.email !== null) userUpdates.email = data.email === '' ? null : data.email;
    if (data.phone !== undefined && data.phone !== null) userUpdates.phone = data.phone;
    if (data.countryCode !== undefined && data.countryCode !== null) userUpdates.countryCode = data.countryCode;
    if (data.jamaat !== undefined && data.jamaat !== null) userUpdates.jamaat = data.jamaat;
    if (data.preferredLanguage !== undefined && data.preferredLanguage !== null) userUpdates.preferredLanguage = data.preferredLanguage;

    if (Object.keys(userUpdates).length > 0) {
      try {
        await db.update(users).set(userUpdates).where(eq(users.id, userId));
      } catch (err: any) {
        const dbErrorCode = err?.code || err?.cause?.code;
        if (dbErrorCode === '23505') {
          return NextResponse.json({
            error: 'DUPLICATE_PHONE',
            message: 'This phone number is already registered to another account.',
          }, { status: 409 });
        }
        throw err;
      }
    }

    // Update profiles table
    const profileUpdates: any = {};
    if (data.education !== undefined) profileUpdates.education = data.education;
    if (data.fieldOfStudy !== undefined) profileUpdates.fieldOfStudy = data.fieldOfStudy;
    if (data.profession !== undefined) profileUpdates.profession = data.profession;
    if (data.heightCm !== undefined) profileUpdates.heightCm = data.heightCm;
    if (data.willingToRelocate !== undefined) profileUpdates.willingToRelocate = data.willingToRelocate;
    if (data.maritalStatus !== undefined) profileUpdates.maritalStatus = data.maritalStatus;
    if (data.brothersCount !== undefined) profileUpdates.brothersCount = data.brothersCount;
    if (data.brothersMarriedCount !== undefined) profileUpdates.brothersMarriedCount = data.brothersMarriedCount;
    if (data.sistersCount !== undefined) profileUpdates.sistersCount = data.sistersCount;
    if (data.sistersMarriedCount !== undefined) profileUpdates.sistersMarriedCount = data.sistersMarriedCount;
    if (data.hasChildren !== undefined) profileUpdates.hasChildren = data.hasChildren;
    if (data.childrenCount !== undefined) profileUpdates.childrenCount = data.childrenCount;
    if (data.childrenBoysCount !== undefined) profileUpdates.childrenBoysCount = data.childrenBoysCount;
    if (data.childrenGirlsCount !== undefined) profileUpdates.childrenGirlsCount = data.childrenGirlsCount;
    if (data.childrenLivingStatus !== undefined) profileUpdates.childrenLivingStatus = data.childrenLivingStatus;

    if (Object.keys(profileUpdates).length > 0) {
      const existing = await db.select({ userId: profiles.userId }).from(profiles).where(eq(profiles.userId, userId)).limit(1).then(res => res[0]);
      if (!existing) {
        await db.insert(profiles).values({ userId, alias: `New ${Math.floor(100000 + Math.random() * 900000)}`, ...profileUpdates });
      } else {
        await db.update(profiles).set(profileUpdates).where(eq(profiles.userId, userId));
      }
    }

    // Handle alias generation on name update if it's not set properly
    if (data.name) {
      const [existingProfile] = await db.select({ alias: profiles.alias }).from(profiles).where(eq(profiles.userId, userId));
      
      if (!existingProfile?.alias || existingProfile.alias === data.name.split(' ')[0] || existingProfile.alias.startsWith('New')) {
        const [existingUser] = await db.select({ gender: users.gender }).from(users).where(eq(users.id, userId));
        const userGender = (data.gender || existingUser?.gender || 'male') as 'male' | 'female';
        
        let aliasSaved = false;
        for (let i = 0; i < 5; i++) {
          const candidate = await generateUniqueAlias(userGender);
          try {
            await db.update(profiles).set({ alias: candidate }).where(eq(profiles.userId, userId));
            aliasSaved = true;
            break;
          } catch (e: any) {
             if (e.code === '23505' || (e.message && e.message.includes('unique constraint'))) {
               continue;
             }
             throw e;
          }
        }
        
        if (!aliasSaved) {
           const candidate = await generateUniqueAlias(userGender);
           const suffix = Math.floor(100 + Math.random() * 900);
           await db.update(profiles).set({ alias: `${candidate} ${suffix}` }).where(eq(profiles.userId, userId));
        }
      }
    }

    const [finalProfile] = await db.select({ alias: profiles.alias }).from(profiles).where(eq(profiles.userId, userId));
    return NextResponse.json({ success: true, alias: finalProfile?.alias });
  } catch (error) {
    console.error('Save basics error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

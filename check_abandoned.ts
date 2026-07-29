import { db } from './src/lib/db';
import { users, profiles } from './src/lib/db/schema';
import { eq, and, or, isNull, sql } from 'drizzle-orm';

async function main() {
  console.log('--- AUDITING ABANDONED ACCOUNTS IN DATABASE ---');
  
  const allUsersWithProfile = await db
    .select({
      id: users.id,
      phone: users.phone,
      name: users.name,
      city: users.city,
      gender: users.gender,
      isActive: users.isActive,
      createdAt: users.createdAt,
      photoKey: profiles.photoKey,
      maritalStatus: profiles.maritalStatus,
      bioText: profiles.bioText,
    })
    .from(users)
    .leftJoin(profiles, eq(users.id, profiles.userId));

  const total = allUsersWithProfile.length;
  console.log(`Total Users in DB: ${total}\n`);

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Categorize
  let stuckAtOtp = 0; // name === 'New User' or city === '' or gender is null
  let stuckAtOtp7Days = 0;
  let stuckAtOtp30Days = 0;

  let noPhotoOrBio = 0; // has basic info but no photo and no bio
  let noPhotoOrBio7Days = 0;

  let inactiveCount = 0;

  const abandonedList: any[] = [];

  for (const u of allUsersWithProfile) {
    if (!u.isActive) inactiveCount++;

    const isStuckAtOtp = u.name === 'New User' || !u.city || !u.gender || !u.maritalStatus;
    const isOlderThan7Days = u.createdAt ? new Date(u.createdAt) < sevenDaysAgo : false;
    const isOlderThan30Days = u.createdAt ? new Date(u.createdAt) < thirtyDaysAgo : false;

    if (isStuckAtOtp) {
      stuckAtOtp++;
      if (isOlderThan7Days) {
        stuckAtOtp7Days++;
        abandonedList.push({ id: u.id, name: u.name, phone: u.phone, createdAt: u.createdAt, reason: 'Stuck at OTP/Basics (>7d)' });
      }
      if (isOlderThan30Days) {
        stuckAtOtp30Days++;
      }
    } else if (!u.photoKey && !u.bioText) {
      noPhotoOrBio++;
      if (isOlderThan7Days) {
        noPhotoOrBio7Days++;
      }
    }
  }

  console.log('👉 Breakdown of Onboarding Drop-offs:');
  console.log(`1. Stuck at OTP / No Basics Completed (Name="New User" or Gender/City/MaritalStatus NULL):`);
  console.log(`   - Total anytime: ${stuckAtOtp}`);
  console.log(`   - Older than 7 days (Proposed Abandoned Window): ${stuckAtOtp7Days}`);
  console.log(`   - Older than 30 days: ${stuckAtOtp30Days}\n`);

  console.log(`2. Completed Basics but No Photo & No Bio:`);
  console.log(`   - Total anytime: ${noPhotoOrBio}`);
  console.log(`   - Older than 7 days: ${noPhotoOrBio7Days}\n`);

  console.log(`3. Currently Inactive (is_active = false) in DB: ${inactiveCount}\n`);

  console.log('👉 Sample of accounts qualifying as abandoned (>7 days, stuck at OTP/Basics):');
  console.log(JSON.stringify(abandonedList.slice(0, 10), null, 2));

  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

import { db } from './src/lib/db';
import { profiles } from './src/lib/db/schema';
import { and, isNotNull, isNull, ne, eq } from 'drizzle-orm';
import { generateBlurredPhotoBuffer, blurredKeyFor } from './src/lib/blurPhoto';
import { uploadObject } from './src/lib/storage';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   BACKFILL: blurred photo derivatives for existing accounts     ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const targets = await db
    .select({ userId: profiles.userId, photoKey: profiles.photoKey })
    .from(profiles)
    .where(and(isNotNull(profiles.photoKey), ne(profiles.photoKey, ''), isNull(profiles.photoKeyBlurred)));

  console.log(`👉 Real accounts with a photo but NO blurred derivative yet: ${targets.length}\n`);
  targets.forEach(t => console.log(`   - ${t.userId} | ${t.photoKey}`));
  console.log('');

  if (targets.length === 0) {
    console.log('Nothing to backfill.');
    process.exit(0);
  }

  let successCount = 0;
  let failureCount = 0;
  const failures: { userId: string; photoKey: string | null; reason: string }[] = [];

  for (const target of targets) {
    if (!target.photoKey) continue;
    try {
      const buffer = await generateBlurredPhotoBuffer(target.photoKey);
      if (!buffer) {
        throw new Error('generateBlurredPhotoBuffer returned null (fetch or blur failed)');
      }
      const blurredKey = blurredKeyFor(target.photoKey);
      await uploadObject(blurredKey, buffer, 'image/jpeg');
      await db.update(profiles).set({ photoKeyBlurred: blurredKey }).where(eq(profiles.userId, target.userId));
      successCount++;
      console.log(`   ✅ ${target.userId} -> ${blurredKey}`);
    } catch (e: any) {
      failureCount++;
      failures.push({ userId: target.userId, photoKey: target.photoKey, reason: e?.message || String(e) });
      console.log(`   ❌ ${target.userId} -> FAILED: ${e?.message || e}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`   BACKFILL COMPLETE: ${successCount} succeeded, ${failureCount} failed (of ${targets.length} total)`);
  console.log('═══════════════════════════════════════════════════════════════');
  if (failures.length > 0) {
    console.log('\nFailures:');
    console.log(JSON.stringify(failures, null, 2));
  }

  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

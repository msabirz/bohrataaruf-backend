import { db } from './db';
import { aliasFrameworks } from './db/schema';
import { eq, inArray, and } from 'drizzle-orm';

export async function generateUniqueAlias(gender: 'male' | 'female'): Promise<string> {
  const allowedRoutes = [gender.toUpperCase() as 'MALE' | 'FEMALE', 'NEUTRAL'] as const;
  
  const frameworks = await db
    .select({ prefixes: aliasFrameworks.prefixes, suffixes: aliasFrameworks.suffixes })
    .from(aliasFrameworks)
    .where(
      and(
        eq(aliasFrameworks.active, true),
        inArray(aliasFrameworks.genderRoute, allowedRoutes)
      )
    );

  if (frameworks.length === 0) {
    // Fallback if no frameworks exist in DB yet
    return `Anonymous ${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const allPrefixes = frameworks.flatMap(f => f.prefixes as string[]);
  const allSuffixes = frameworks.flatMap(f => f.suffixes as string[]);

  if (allPrefixes.length === 0 || allSuffixes.length === 0) {
    return `Anonymous ${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const prefix = allPrefixes[Math.floor(Math.random() * allPrefixes.length)];
  const suffix = allSuffixes[Math.floor(Math.random() * allSuffixes.length)];

  return `${prefix} ${suffix}`;
}

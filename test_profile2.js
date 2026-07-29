const { db } = require('./src/lib/db');
const { preferences, users } = require('./src/lib/db/schema');
const { eq } = require('drizzle-orm');

async function test() {
  const allUsers = await db.select().from(users).limit(1);
  if (allUsers.length === 0) return;
  const userId = allUsers[0].id;
  
  const prefs = await db.select().from(preferences).where(eq(preferences.userId, userId)).limit(1).then(res => res[0]);
  console.log("Raw prefs from DB:", prefs);

  const { serializeProfile } = require('./src/lib/api/serialize');
  const payload = await serializeProfile({}, {}, prefs);
  console.log("Serialized payload:", JSON.stringify(payload, null, 2));
}
test().catch(console.error);

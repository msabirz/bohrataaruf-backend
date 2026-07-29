const { db } = require('./src/lib/db');
const { preferences } = require('./src/lib/db/schema');
const { eq } = require('drizzle-orm');

async function test() {
  const prefs = await db.select().from(preferences).limit(1);
  console.log("Raw prefs:", prefs);
}
test().catch(console.error);

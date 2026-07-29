const { db } = require('./src/lib/db');
const { users, profiles } = require('./src/lib/db/schema');
const { signToken } = require('./src/lib/api/auth');

async function test() {
  // 1. Find or create a user
  let userRows = await db.select().from(users).limit(1);
  if (userRows.length === 0) {
    console.log("No users in db.");
    process.exit(1);
  }
  const user = userRows[0];
  
  // 2. Generate token
  const token = await signToken(user.id);

  // 3. Make request
  const http = require('http');
  const payload = JSON.stringify({
    limit: 4,
    filters: { city: 'Mumbai' }
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/matching/batch',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payload.length,
      'Cookie': `auth_token=${token}`
    }
  };

  const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      console.log('RESPONSE:', JSON.stringify(JSON.parse(body), null, 2));
      process.exit(0);
    });
  });

  req.on('error', (e) => {
    console.error(e);
    process.exit(1);
  });
  req.write(payload);
  req.end();
}

test().catch(console.error);

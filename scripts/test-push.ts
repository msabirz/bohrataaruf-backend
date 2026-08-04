/**
 * Scratch script to test the push notification send path.
 * 
 * Usage:
 *   npx tsx -r dotenv/config scripts/test-push.ts dotenv_config_path=.env.local <expo-push-token>
 * 
 * Get the Expo push token by opening the app on your phone after the 
 * token registration flow is working — it will be logged in the console
 * (look for "[registerToken] Got Expo push token:").
 */
import { sendPushNotification, PushCategory } from '../src/lib/pushNotifications';
import { db } from '../src/lib/db';
import { pushTokens } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const token = process.argv[2];
  if (!token) {
    console.error('Usage: npx tsx -r dotenv/config scripts/test-push.ts dotenv_config_path=.env.local <expo-push-token>');
    process.exit(1);
  }

  console.log(`Testing push send to token: ${token}\n`);

  // Find the userId associated with this token in the DB
  const tokenRow = await db
    .select({ userId: pushTokens.userId })
    .from(pushTokens)
    .where(eq(pushTokens.token, token))
    .limit(1)
    .then(r => r[0] ?? null);

  if (!tokenRow) {
    console.error('Token not found in push_tokens table. Register the token from the app first.');
    process.exit(1);
  }

  const { userId } = tokenRow;
  console.log(`Found userId: ${userId}\n`);

  const categories: PushCategory[] = [
    'matches',
    'received_interests', 
    'verification_updates',
    'handoff_updates',
    'security_alerts',
    'support_alerts',
  ];

  const titles: Record<PushCategory, string> = {
    matches: "You have a new match!",
    received_interests: "Someone's interested in you",
    verification_updates: "You're verified!",
    handoff_updates: "You can now connect!",
    security_alerts: "Security alert",
    support_alerts: "Support replied to your ticket",
    photo_requests: "Photo request update",
  };

  const bodies: Record<PushCategory, string> = {
    matches: "Someone you're interested in is interested in you too. Open the app to see who.",
    received_interests: "Check your Received tab to see their profile.",
    verification_updates: "Your ITS verification was approved. You can now browse and connect with others.",
    handoff_updates: "You've both shared your details. Check your matches to continue the conversation.",
    security_alerts: "An unusual login was detected on your account.",
    photo_requests: "Someone requested to view your photo.",
    support_alerts: "Your inquiry has been answered. Tap to view the reply.",
  };

  for (const category of categories) {
    console.log(`Sending [${category}] notification...`);
    await sendPushNotification(userId, category, titles[category], bodies[category], { test: true });
    console.log(`✓ Done\n`);
    // Small delay between sends
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('All test notifications sent!');
  process.exit(0);
}

main().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});

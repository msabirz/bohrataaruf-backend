import 'dotenv/config';
import { db } from './src/lib/db';
import { aliasFrameworks } from './src/lib/db/schema';

const frameworks = [
  {
    frameworkName: 'Classic Male',
    genderRoute: 'MALE' as const,
    prefixes: ['Noble', 'Brave', 'Calm', 'Steadfast', 'Honorable', 'Resolute', 'Earnest', 'Gentle', 'Modest', 'Faithful'],
    suffixes: ['Falcon', 'Cedar', 'Harbor', 'Mountain', 'Compass', 'Atlas', 'Zenith', 'Beacon', 'Pillar', 'Anchor'],
    active: true,
  },
  {
    frameworkName: 'Classic Female',
    genderRoute: 'FEMALE' as const,
    prefixes: ['Graceful', 'Serene', 'Radiant', 'Luminous', 'Pure', 'Sweet', 'Gentle', 'Modest', 'Quiet', 'Elegant'],
    suffixes: ['Lotus', 'Willow', 'Dawn', 'Pearl', 'Horizon', 'Dove', 'Blossom', 'Meadow', 'Star', 'Haven'],
    active: true,
  },
  {
    frameworkName: 'Neutral Nature',
    genderRoute: 'NEUTRAL' as const,
    prefixes: ['Quiet', 'Calm', 'Peaceful', 'Bright', 'Gentle', 'Deep', 'Clear', 'Serene', 'Warm', 'Steady'],
    suffixes: ['River', 'Valley', 'Forest', 'Ocean', 'Sky', 'Breeze', 'Island', 'Lake', 'Canyon', 'Oasis'],
    active: true,
  },
  {
    frameworkName: 'Neutral Virtues',
    genderRoute: 'NEUTRAL' as const,
    prefixes: ['Sincere', 'Honest', 'Loyal', 'Just', 'Fair', 'True', 'Earnest', 'Kind', 'Noble', 'Humble'],
    suffixes: ['Soul', 'Spirit', 'Heart', 'Mind', 'Seeker', 'Guide', 'Friend', 'Companion', 'Voyager', 'Thinker'],
    active: true,
  }
];

async function seed() {
  console.log('Seeding alias frameworks...');
  for (const fw of frameworks) {
    await db.insert(aliasFrameworks).values(fw);
  }
  console.log('Finished seeding 4 frameworks.');
  process.exit(0);
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
});

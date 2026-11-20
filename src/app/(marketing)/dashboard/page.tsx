import { redirect } from 'next/navigation';
import { isModeB } from '@/lib/modeGuard';

// The teaser dashboard is retired now that the real Discover/Interests/Match
// loop exists — this just forwards any old links/bookmarks.
export default async function DashboardRedirect() {
  redirect((await isModeB()) ? '/profile' : '/discover');
}

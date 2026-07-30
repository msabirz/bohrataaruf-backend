import { redirect } from 'next/navigation';

// The teaser dashboard is retired now that the real Discover/Interests/Match
// loop exists — this just forwards any old links/bookmarks.
export default function DashboardRedirect() {
  redirect('/discover');
}

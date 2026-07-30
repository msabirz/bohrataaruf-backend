import { redirect } from 'next/navigation';

// Edit Profile now lives at /profile under the authenticated app shell —
// this just forwards any old links/bookmarks.
export default function DashboardEditRedirect() {
  redirect('/profile');
}

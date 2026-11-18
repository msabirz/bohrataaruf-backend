import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getAuthenticatedUserFromCookie } from '@/lib/api/pageAuth';
import { AppHeader } from '@/components/app/AppHeader';
import { utmParamsFromSearch } from '@/lib/utm';
import { ShareAnnouncement } from '@/components/share/ShareAnnouncement';
import { GoogleTagManager } from '@/components/analytics/GoogleTagManager';
import '../globals.css';

const APP_NAME = process.env.APP_DISPLAY_NAME ?? 'Bohra Taaruf';

export const metadata: Metadata = {
  title: {
    template: `%s | ${APP_NAME}`,
    default: APP_NAME,
  },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUserFromCookie();

  if (!user) {
    const headerList = await headers();
    // Set by middleware for these specific routes (see src/middleware.ts) so the
    // login modal can send the user back to where they were trying to go.
    const pathname = headerList.get('x-pathname') || '';
    // Keep the email campaign's tags through the bounce so Google Analytics can still
    // credit this visit to the campaign (see src/lib/utm.ts).
    const params = utmParamsFromSearch(headerList.get('x-search'));
    const redirectTarget = pathname
      ? `/?${new URLSearchParams({ redirect: pathname, ...Object.fromEntries(params) }).toString()}`
      : '/';
    redirect(redirectTarget);
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
      <GoogleTagManager />
      <AppHeader />
      <main className="flex-1">{children}</main>
      <ShareAnnouncement />
    </div>
  );
}

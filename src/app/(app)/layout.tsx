import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getAuthenticatedUserFromCookie } from '@/lib/api/pageAuth';
import { AppHeader } from '@/components/app/AppHeader';
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
    const redirectTarget = pathname ? `/?redirect=${encodeURIComponent(pathname)}` : '/';
    redirect(redirectTarget);
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
      <AppHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}

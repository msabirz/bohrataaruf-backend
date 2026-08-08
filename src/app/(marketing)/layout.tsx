import { Metadata } from 'next';
import { Header } from '@/components/marketing/Header';
import { Footer } from '@/components/marketing/Footer';
import '../globals.css';

const APP_NAME = process.env.APP_DISPLAY_NAME ?? 'Bohra Taaruf';

export const metadata: Metadata = {
  title: {
    template: `%s | ${APP_NAME}`,
    default: `${APP_NAME} - A Trusted Space for the Dawoodi Bohra Community`,
  },
  description: 'A verified, private, and thoughtful matchmaking platform exclusively for the Dawoodi Bohra community.',
  openGraph: {
    title: APP_NAME,
    description: 'A verified, private, and thoughtful matchmaking platform exclusively for the Dawoodi Bohra community.',
    url: 'https://bohrataaruf.com',
    siteName: APP_NAME,
    locale: 'en_US',
    type: 'website',
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

import { Metadata } from 'next';
import { Header } from '@/components/marketing/Header';
import { Footer } from '@/components/marketing/Footer';
import { GoogleTagManager } from '@/components/analytics/GoogleTagManager';
import { LocaleProvider } from '@/lib/context/LocaleContext';
import { DEFAULT_SHARE_IMAGE, organizationJsonLd, siteNavigationJsonLd, websiteJsonLd } from '@/lib/seo';
import '../globals.css';

const APP_NAME = process.env.APP_DISPLAY_NAME ?? 'Bohra Taaruf';

export const metadata: Metadata = {
  title: {
    template: `%s | ${APP_NAME}`,
    default: `${APP_NAME} - A Trusted Space for the Dawoodi Bohra Community`,
  },
  description: 'Private, verified Dawoodi Bohra profiles you can view and show interest in, and the Smart Taaruf Card: your biodata as a private link you control. Free.',
  openGraph: {
    title: APP_NAME,
    description: 'Private, verified Dawoodi Bohra profiles you can view and show interest in, and the Smart Taaruf Card: your biodata as a private link you control. Free.',
    url: 'https://bohrataaruf.com',
    siteName: APP_NAME,
    locale: 'en_US',
    type: 'website',
    images: [DEFAULT_SHARE_IMAGE],
  },
  twitter: { card: 'summary_large_image', images: [DEFAULT_SHARE_IMAGE.url] },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary">
      {/* Site-wide identity + nav schema — present on every marketing page,
          not per-page, since it describes the site itself. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteNavigationJsonLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }} />
      <GoogleTagManager />
      <LocaleProvider>
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </LocaleProvider>
    </div>
  );
}

import Script from 'next/script';

// Google Tag Manager container for bohrataaruf.com (GA4 is configured inside GTM).
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-PVW25KJ4';

/**
 * Loads Google Tag Manager on PRODUCTION only (VERCEL_ENV === 'production'):
 * never on localhost, and never on Vercel preview deployments.
 *
 * Deliberately NOT mounted in the root layout. It is added only to the marketing
 * and signed-in app layouts, so it never loads on:
 *   - /s/[token] and /biodata/[token]: the link token in the URL is the secret
 *     that opens someone's biodata, and Google Analytics records page URLs;
 *   - /admin/*: volunteer-only screens with user data.
 */
export function GoogleTagManager() {
  if (process.env.VERCEL_ENV !== 'production') return null;
  return (
    <>
      <Script id="gtm-loader" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
      </Script>
      <noscript>
        <iframe src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`} height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} title="Google Tag Manager" />
      </noscript>
    </>
  );
}

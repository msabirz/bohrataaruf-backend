import type { MetadataRoute } from 'next';

/**
 * Lets Android (and other browsers) use the real logo when someone adds the site to their
 * home screen. The maskable icon has extra space around the arch so a round crop never clips it.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bohra Taaruf',
    short_name: 'Bohra Taaruf',
    description: 'Private profiles and the Smart Taaruf Card: your biodata as a private link you control.',
    start_url: '/',
    display: 'browser',
    background_color: '#FAF6EF',
    theme_color: '#8C6A3F',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

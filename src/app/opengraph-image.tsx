import { ImageResponse } from 'next/og';

export const alt = 'Bohra Taaruf: a free, private matrimonial platform for Dawoodi Bohra families';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * The default share image for every page that does not make its own (the homepage,
 * About, the Smart Taaruf Card, and so on): the logo mark and the name on the brand colours.
 * Biodata links under /s/ have their own card.
 */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', alignItems: 'center',
          background: 'linear-gradient(120deg, #3F2A16 0%, #8C6A3F 100%)', padding: 90, color: '#fff',
        }}
      >
        <svg width="220" height="290" viewBox="0 0 110 145">
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F3E3C8" />
              <stop offset="100%" stopColor="#C9A96E" />
            </linearGradient>
          </defs>
          <polygon points="55,8 59,13 55,18 51,13" fill="url(#lg)" />
          <path d="M20,118 L20,55 Q20,18 55,18 Q90,18 90,55 L90,118" fill="none" stroke="url(#lg)" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M25,118 L25,57 Q25,23 55,23 Q85,23 85,57 L85,118" fill="none" stroke="#E8D3A8" strokeWidth="1" opacity="0.5" />
          <circle cx="42" cy="85" r="7" fill="#E8D3A8" opacity="0.6" />
          <circle cx="68" cy="85" r="7" fill="#E8D3A8" opacity="0.6" />
          <rect x="12" y="120" width="86" height="3" rx="1.5" fill="url(#lg)" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 80 }}>
          <div style={{ fontSize: 92, fontWeight: 700 }}>Bohra Taaruf</div>
          <div style={{ fontSize: 40, marginTop: 18, color: '#F3E3C8', maxWidth: 700 }}>
            Free, private matchmaking for Dawoodi Bohra families
          </div>
          <div style={{ fontSize: 30, marginTop: 36, color: '#E8D3A8' }}>bohrataaruf.com</div>
        </div>
      </div>
    ),
    { ...size },
  );
}

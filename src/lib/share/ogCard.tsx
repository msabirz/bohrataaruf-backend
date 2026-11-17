import { ImageResponse } from 'next/og';

export const SHARE_CARD_SIZE = { width: 1200, height: 630 } as const;

/**
 * Draws the minimal chat card: blurred photo in a door-shaped arch, first name,
 * age and city. The photo itself carries the arch radius, because the image
 * renderer does not clip a child image to its parent's rounded corners.
 */
export function shareCardImage(p: { heading: string; sub: string; photoUrl: string | null; initial: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', alignItems: 'center',
          background: 'linear-gradient(120deg, #3F2A16 0%, #8C6A3F 100%)', padding: 80, color: '#fff',
        }}
      >
        <div
          style={{
            width: 300, height: 380, borderRadius: '150px 150px 24px 24px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', background: '#F6EBD9', border: '8px solid #FAF6EF',
            fontSize: 130, color: '#8A5A2B',
          }}
        >
          {p.photoUrl ? (
            <img src={p.photoUrl} width={284} height={364} style={{ objectFit: 'cover', borderRadius: '142px 142px 16px 16px' }} alt="" />
          ) : (
            p.initial
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 70 }}>
          <div style={{ fontSize: 30, letterSpacing: 4, textTransform: 'uppercase', color: '#E8D3A8' }}>Bohra Taaruf</div>
          <div style={{ fontSize: 88, fontWeight: 700, marginTop: 16 }}>{p.heading}</div>
          <div style={{ fontSize: 44, marginTop: 10, color: '#F3E3C8' }}>{p.sub}</div>
          <div style={{ fontSize: 28, marginTop: 40, color: '#E8D3A8' }}>Tap to see the biodata</div>
        </div>
      </div>
    ),
    { ...SHARE_CARD_SIZE },
  );
}

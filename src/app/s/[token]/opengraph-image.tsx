import { ImageResponse } from 'next/og';
import { peekLink } from '@/lib/share/resolve';
import { loadSharedProfile } from '@/lib/share/loadSharedProfile';

export const alt = 'A biodata shared on Bohra Taaruf';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
// Depends on live link state — must not be cached at build/first-request.
export const dynamic = 'force-dynamic';

/**
 * The chat-card image. ALWAYS minimal and ALWAYS blurred, regardless of what
 * the full page shows: first name, age, city, blurred photo. Never consumes a link.
 */
export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await peekLink(token);

  let heading = 'Bohra Taaruf';
  let sub = 'A biodata shared with you';
  let photoUrl: string | null = null;
  let initial = 'B';

  if (ctx && ctx.status === 'active') {
    const p = await loadSharedProfile(ctx.link.userId, { forceBlurred: true });
    if (p) {
      const bits = [p.showAge && p.age != null ? `${p.age}` : null, p.showCity ? p.city : null].filter(Boolean);
      heading = p.firstName;
      sub = bits.length ? bits.join(' · ') : 'A biodata shared with you';
      photoUrl = p.photo?.blurred ? p.photo.url : null;
      initial = p.firstName.slice(0, 1).toUpperCase();
    }
  }

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
            width: 300, height: 380, borderRadius: '150px 150px 24px 24px', overflow: 'hidden', display: 'flex',
            alignItems: 'center', justifyContent: 'center', background: '#F6EBD9', border: '8px solid #FAF6EF',
            fontSize: 130, color: '#8A5A2B',
          }}
        >
          {photoUrl ? (
            <img src={photoUrl} width={300} height={380} style={{ objectFit: 'cover' }} alt="" />
          ) : (
            initial
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 70 }}>
          <div style={{ fontSize: 30, letterSpacing: 4, textTransform: 'uppercase', color: '#E8D3A8' }}>Bohra Taaruf</div>
          <div style={{ fontSize: 88, fontWeight: 700, marginTop: 16 }}>{heading}</div>
          <div style={{ fontSize: 44, marginTop: 10, color: '#F3E3C8' }}>{sub}</div>
          <div style={{ fontSize: 28, marginTop: 40, color: '#E8D3A8' }}>Tap to see the biodata</div>
        </div>
      </div>
    ),
    { ...size },
  );
}

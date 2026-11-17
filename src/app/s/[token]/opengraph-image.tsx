import { shareCardImage, SHARE_CARD_SIZE } from '@/lib/share/ogCard';
import { peekLink } from '@/lib/share/resolve';
import { loadSharedProfile } from '@/lib/share/loadSharedProfile';

export const alt = 'A biodata shared on Bohra Taaruf';
export const size = SHARE_CARD_SIZE;
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

  return shareCardImage({ heading, sub, photoUrl, initial });
}

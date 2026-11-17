import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthenticatedUserFromCookie } from '@/lib/api/pageAuth';
import { loadSharedProfile } from '@/lib/share/loadSharedProfile';
import { getSharePromo } from '@/lib/share/promo';
import { SharedPageView } from '@/components/share/SharedPageView';

export const metadata: Metadata = { title: 'Preview of my shared page' };
export const dynamic = 'force-dynamic';

/**
 * What her link shows, drawn by the SAME server code the public page uses
 * (loadSharedProfile + SharedPageView), so the preview can never drift from the
 * real thing. Opening this page never touches a link or records an open.
 */
export default async function SharePreviewPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const user = await getAuthenticatedUserFromCookie();
  if (!user) redirect('/');
  const { view } = await searchParams;
  const isCard = view === 'card';

  const promo = await getSharePromo();
  const profile = await loadSharedProfile(user.id, { forceBlurred: isCard });
  if (!profile) redirect('/share');

  const tab = (active: boolean) =>
    `px-4 py-2 rounded-full text-sm font-semibold transition-colors ${active ? 'bg-primary text-surface' : 'text-muted'}`;

  const cardBits = [profile.showAge && profile.age != null ? String(profile.age) : null, profile.showCity ? profile.city : null].filter(Boolean);

  return (
    <div className="bg-background">
      <div className="container mx-auto max-w-[760px] px-6 pt-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link href="/share" className="text-sm font-semibold text-muted hover:text-foreground transition-colors">← Back to Share</Link>
          <div className="inline-flex bg-surface border border-border rounded-full p-1 shadow-sm">
            <Link href="/share/preview" className={tab(!isCard)}>Profile page</Link>
            <Link href="/share/preview?view=card" className={tab(isCard)}>Link preview</Link>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted bg-accent-light border border-accent rounded-xl px-4 py-3">
          {isCard
            ? 'This is the small card people see when your link is pasted in a chat. It always shows only your first name, age and city with a blurred photo, because chat cards stay in chats for ever.'
            : 'This is the page people see when they open your link. It shows only what you chose in "What I share". This preview is private and does not use up any link.'}
        </p>
      </div>

      {isCard ? (
        <div className="container mx-auto max-w-[760px] px-6 py-10">
          <div className="max-w-sm mx-auto rounded-2xl overflow-hidden border border-border bg-surface shadow-md">
            <div className="flex items-center gap-4 px-5 py-6" style={{ background: 'linear-gradient(120deg, #3F2A16 0%, #8C6A3F 100%)' }}>
              <div className="w-20 h-24 rounded-t-[40px] rounded-b-xl overflow-hidden bg-accent-light border-4 border-background flex items-center justify-center shrink-0">
                {profile.photo ? (
                  <img src={profile.photo.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-primary" style={{ fontFamily: 'Georgia, serif' }}>{profile.firstName.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div className="text-white">
                <div className="text-xs tracking-widest uppercase text-[#E8D3A8]">Bohra Taaruf</div>
                <div className="text-2xl font-bold mt-1">{profile.firstName}</div>
                {cardBits.length > 0 && <div className="text-[#F3E3C8]">{cardBits.join(' · ')}</div>}
              </div>
            </div>
            <div className="px-5 py-3 text-sm text-muted">
              <div className="font-semibold text-primary">bohrataaruf.com</div>
              <div>Tap to see the biodata</div>
            </div>
          </div>
        </div>
      ) : (
        <SharedPageView profile={profile} promo={promo} joinHref="/signup" />
      )}
    </div>
  );
}

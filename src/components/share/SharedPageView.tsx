import type { SharedProfile } from '@/lib/share/loadSharedProfile';
import type { SharePromo } from '@/lib/share/promo';

const SERIF = { fontFamily: "Georgia, 'Times New Roman', serif" } as const;

function Lattice() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 800 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id="share-arches" width="80" height="112" patternUnits="userSpaceOnUse">
          <path d="M0 112V56a40 40 0 0 1 80 0v56" fill="none" stroke="#FFFFFC" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="800" height="200" fill="url(#share-arches)" />
    </svg>
  );
}

export function PromoBlock({ promo, joinHref }: { promo: SharePromo; joinHref: string }) {
  return (
    <section
      className="rounded-3xl text-white px-6 py-8 sm:px-10 text-center"
      style={{ background: 'linear-gradient(135deg, #3F2A16, #6E4520)' }}
      aria-label="About Bohra Taaruf"
    >
      <p className="text-sm tracking-wide uppercase text-[#E8D3A8] font-semibold">Bohra Taaruf is awaiting Raza Mubarak</p>
      <p className="mt-3 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed" style={SERIF}>{promo.promoText}</p>
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center items-center">
        <a
          href={joinHref}
          className="inline-flex items-center justify-center min-h-12 px-8 rounded-full font-bold text-[#3F2A16] bg-[#C9A24B] hover:bg-[#d6b05a] transition-colors"
        >
          {promo.joinLabel}
        </a>
        <a
          href={promo.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center min-h-12 px-6 rounded-full font-semibold border border-[#C9A24B] text-[#F3E3C8] hover:bg-white/10 transition-colors"
        >
          Follow @bohrataaruf
        </a>
      </div>
      <a href={promo.siteUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-5 text-sm text-[#E8D3A8] underline underline-offset-4">
        Visit bohrataaruf.com
      </a>
    </section>
  );
}

export function SharedPageView({ profile, promo, joinHref }: { profile: SharedProfile; promo: SharePromo; joinHref: string }) {
  const initial = profile.firstName.slice(0, 1).toUpperCase();
  return (
    <main className="min-h-screen bg-background pb-16">
      <div className="relative h-56 sm:h-60" style={{ background: 'linear-gradient(120deg, #3F2A16 0%, #8C6A3F 100%)' }}>
        <Lattice />
        <div className="relative container mx-auto max-w-[760px] px-6 pt-6 flex items-center gap-3 text-white">
          <img src="/logo-light.svg" alt="" className="h-9 w-auto" />
          <span className="text-lg font-semibold" style={SERIF}>Bohra Taaruf</span>
        </div>
      </div>

      <div className="relative z-10 container mx-auto max-w-[760px] px-6 -mt-20">
        <div className="bg-surface border border-border rounded-3xl shadow-sm px-6 sm:px-10 pb-8 text-center">
          <div className="-mt-16 mx-auto w-32 h-40 rounded-t-[64px] rounded-b-2xl overflow-hidden border-4 border-surface bg-accent-light shadow-sm flex items-center justify-center">
            {profile.photo ? (
              <img
                src={profile.photo.url}
                alt=""
                className="w-full h-full object-cover"
                style={profile.photo.blurred ? { transform: 'scale(1.05)' } : undefined}
              />
            ) : (
              <span className="text-4xl font-bold text-primary" style={SERIF}>{initial}</span>
            )}
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-semibold text-foreground" style={SERIF}>{profile.displayName}</h1>
          {profile.chips.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {profile.chips.map((c) => (
                <span key={c} className="px-3 py-1.5 rounded-full bg-accent-light text-primary text-sm font-semibold">{c}</span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-4">
          {profile.sections.map((s) => (
            <section key={s.title} className="bg-surface border border-border rounded-2xl px-6 py-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted">{s.title}</h2>
              {s.paragraph && <p className="mt-2 text-foreground leading-relaxed">{s.paragraph}</p>}
              {s.rows.length > 0 && (
                <dl className="mt-3 flex flex-col gap-3">
                  {s.rows.map((row) => (
                    <div key={row.label + row.value}>
                      <dt className="text-xs font-semibold text-muted">{row.label}</dt>
                      <dd className="text-foreground whitespace-pre-line leading-relaxed">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          ))}
        </div>

        <div className="mt-8">
          <PromoBlock promo={promo} joinHref={joinHref} />
        </div>
        <p className="mt-6 text-center text-xs text-muted">Shared privately on Bohra Taaruf. Please do not forward this link.</p>
      </div>
    </main>
  );
}

export function EndedPageView({ promo }: { promo: SharePromo }) {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-md w-full text-center">
        <img src="/logo-light.svg" alt="" className="h-12 w-auto mx-auto" />
        <h1 className="mt-5 text-2xl font-semibold text-foreground" style={SERIF}>This link is switched off or has ended</h1>
        <p className="mt-2 text-muted">Please ask the person who sent it for a new link.</p>
        <div className="mt-8 text-left">
          <PromoBlock promo={promo} joinHref="/signup" />
        </div>
      </div>
    </main>
  );
}

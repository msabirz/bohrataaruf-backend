import Link from 'next/link';
import { SITE_URL, breadcrumbJsonLd, faqJsonLd, pageMetadata } from '@/lib/seo';
import { CARD_PATH, FAQS, INSTAGRAM_URL, OLD_VS_NEW, SAFETY_NOTES, STEPS } from '@/lib/share/campaignContent';

// Title is the search listing: "Smart Taaruf Card: Share Your Biodata Privately | Bohra Taaruf".
export const metadata = {
  ...pageMetadata({
  title: 'Smart Taaruf Card: Share Your Biodata Privately',
  description:
    'Share your marriage biodata as a private link with the Smart Taaruf Card. Choose exactly what people see, keep your photo blurred, send it on WhatsApp, and switch it off any time. Always free.',
  path: CARD_PATH,
  }),
  keywords: [
    'Smart Taaruf Card', 'Bohra biodata', 'Bohra marriage biodata', 'share biodata privately', 'Bohra rishta biodata',
    'Bohra matrimonial biodata format', 'private biodata link', 'Bohra Taaruf', 'Bohri taruf', 'matrimony biodata WhatsApp',
  ],
};

const SERIF = { fontFamily: "Georgia, 'Times New Roman', serif" } as const;

function InstagramIcon({ className = 'w-4 h-4', color = '#C9A24B' }: { className?: string; color?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.3" cy="6.7" r="1.2" fill={color} stroke="none" />
    </svg>
  );
}

function Lattice() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id="card-arches" width="80" height="112" patternUnits="userSpaceOnUse">
          <path d="M0 112V56a40 40 0 0 1 80 0v56" fill="none" stroke="#FFFFFC" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="800" height="400" fill="url(#card-arches)" />
    </svg>
  );
}

const goldBtn = 'inline-flex items-center justify-center min-h-12 px-8 rounded-full font-bold text-[#3F2A16] bg-[#C9A24B] hover:bg-[#d6b05a] transition-colors';
const ghostBtn = 'inline-flex items-center justify-center min-h-12 px-7 rounded-full font-semibold border border-[#C9A24B] text-[#F3E3C8] hover:bg-white/10 transition-colors';

export default function MyTaarufCardPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(FAQS)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Smart Taaruf Card', path: CARD_PATH }])) }}
      />

      {/* Hero */}
      <section className="relative text-white text-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #3F2A16, #6E4520)' }}>
        <Lattice />
        <div className="relative container mx-auto max-w-[900px] px-6 py-16 sm:py-24">
          <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-[#E8D3A8] font-semibold">Bohra Taaruf Introduces the Smart Taaruf Card</p>
          <h1 className="mt-4 text-5xl sm:text-7xl leading-[1.05] font-semibold" style={SERIF}>
            Your Profile.<br />Your Taaruf.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-base sm:text-xl leading-relaxed text-[#F3E3C8]">
            While we wait for Raza Mubarak to open Bohra Taaruf to everyone, you can already share your biodata your own way. Private links. Only what you choose. Switched off whenever you like.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/share" className={goldBtn}>Share now</Link>
            <a href="#how-it-works" className={ghostBtn}>See how it works</a>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-3 justify-center items-center text-sm text-[#E8D3A8]">
            <span>New here? <Link href="/signup" className="underline underline-offset-4">Create your account</Link></span>
            <span className="opacity-50 hidden sm:inline" aria-hidden="true">·</span>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-[#C9A24B]/60 rounded-full px-4 py-1.5 font-semibold text-[#F3E3C8] hover:bg-white/10">
              <InstagramIcon /> Follow @bohrataaruf on Instagram
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="container mx-auto max-w-[1100px] px-6 pt-16 sm:pt-24 pb-6 scroll-mt-24">
        <div className="text-center">
          <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-primary font-bold">How it works in three steps</p>
          <h2 className="mt-3 text-3xl sm:text-5xl font-semibold text-foreground" style={SERIF}>Your Data Stays in Your Control</h2>
        </div>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="bg-surface border border-border rounded-3xl p-7 shadow-sm">
              <span className="w-10 h-10 rounded-full bg-primary text-surface font-bold inline-flex items-center justify-center">{i + 1}</span>
              <h3 className="mt-4 text-2xl font-semibold text-foreground" style={SERIF}>{s.title}</h3>
              <p className="mt-2 text-muted leading-relaxed">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Old way vs new way */}
      <section className="container mx-auto max-w-[1000px] px-6 pt-16 sm:pt-20">
        <div className="text-center">
          <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-primary font-bold">Digitalise your biodata</p>
          <h2 className="mt-3 text-3xl sm:text-5xl leading-tight font-semibold text-foreground" style={SERIF}>
            From PDFs and chat messages to one Smart Taaruf Card.
          </h2>
        </div>

        <div className="mt-8 max-w-[940px] mx-auto flex gap-4 items-start sm:items-center rounded-2xl border-2 border-[#B4442F] bg-[#FBEDE9] px-5 sm:px-7 py-4">
          <span className="shrink-0 w-9 h-9 rounded-full bg-[#B4442F] text-white font-extrabold text-xl inline-flex items-center justify-center" aria-hidden="true">!</span>
          <p className="text-base sm:text-lg leading-relaxed text-[#7A2A1B]">
            <strong>The biggest red flag of a PDF in chats:</strong> once it is sent, you have no control over who sees it or where it is forwarded. With your Smart Taaruf Card, you decide who sees it and you can stop it any time.
          </p>
        </div>

        <div className="mt-8 mx-auto max-w-[780px]">
          <picture>
            <source media="(max-width: 640px)" srcSet="/images/old-vs-new-stacked.svg" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/old-vs-new.svg"
              alt="The old way: a PDF forwarded to people you do not know, with no control. The new way: one private card that goes only to the person you chose."
              className="w-full h-auto mx-auto max-w-[420px] sm:max-w-none"
              width={1200}
              height={660}
            />
          </picture>
        </div>

        <div className="mt-8 bg-surface border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="hidden sm:grid grid-cols-2 text-xs font-bold tracking-widest uppercase">
            <div className="px-6 py-4 bg-[#FBEDE9] text-[#B4442F]">The old way: PDF or photo on WhatsApp</div>
            <div className="px-6 py-4 bg-[#E4F2E9] text-[#1F6B3F] border-l border-border">The new way: one private link</div>
          </div>
          {OLD_VS_NEW.map((row) => (
            <div key={row.old} className="grid sm:grid-cols-2 border-t border-border first:border-t-0 sm:first:border-t">
              <div className="px-5 sm:px-6 py-4 text-muted leading-relaxed flex gap-3 bg-[#FBEDE9]/50 sm:bg-transparent">
                <span className="text-[#B4442F] font-bold" aria-hidden="true">&#10005;</span><span>{row.old}</span>
              </div>
              <div className="px-5 sm:px-6 py-4 leading-relaxed flex gap-3 sm:border-l border-border bg-[#E4F2E9]/60 sm:bg-[#FBFEFC]">
                <span className="text-[#2E7D4F] font-bold" aria-hidden="true">&#10003;</span><span>{row.now}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy first + chat card */}
      <section className="mt-16 sm:mt-24 bg-accent-light/60 py-14 sm:py-20">
        <div className="container mx-auto max-w-[1100px] px-6 grid gap-10 md:grid-cols-2 items-center">
          <div>
            <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-primary font-bold">Privacy first</p>
            <h2 className="mt-3 text-3xl sm:text-4xl leading-tight font-semibold text-foreground" style={SERIF}>Your biodata, your rules.</h2>
            <ul className="mt-6 flex flex-col gap-4 text-base sm:text-lg leading-relaxed text-foreground">
              <li className="flex gap-3"><span className="text-[#2E7D4F] font-bold" aria-hidden="true">&#10003;</span><span>Your phone number, email and ITS number are <strong>never</strong> shown on a shared page.</span></li>
              <li className="flex gap-3"><span className="text-[#2E7D4F] font-bold" aria-hidden="true">&#10003;</span><span>Your photo is <strong>blurred</strong> unless you choose to show it. The small card in a chat is always blurred.</span></li>
              <li className="flex gap-3"><span className="text-[#2E7D4F] font-bold" aria-hidden="true">&#10003;</span><span>A <strong>one-view link</strong> works once, so it cannot be passed around.</span></li>
              <li className="flex gap-3"><span className="text-[#2E7D4F] font-bold" aria-hidden="true">&#10003;</span><span>Switch sharing <strong>off</strong> and every link stops, for good.</span></li>
            </ul>
          </div>
          <div className="bg-[#E8E2D4] rounded-[28px] p-6 sm:p-9 flex flex-col gap-3 items-end">
            <div className="bg-[#DCF8C6] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm max-w-[280px]">Salaam, here is a biodata shared with you on Bohra Taaruf</div>
            <div className="bg-white rounded-2xl rounded-br-sm overflow-hidden w-full max-w-[330px] shadow-md">
              <div className="flex gap-4 items-center p-4 text-white" style={{ background: 'linear-gradient(120deg, #3F2A16, #8C6A3F)' }}>
                <div className="w-16 h-20 shrink-0 rounded-t-[32px] rounded-b-[10px] border-[3px] border-background" style={{ background: 'radial-gradient(circle at 50% 35%, #E8D3B0, #B99A72)' }} />
                <div>
                  <div className="text-[11px] tracking-[0.2em] text-[#E8D3A8]">BOHRA TAARUF</div>
                  <div className="text-2xl font-bold">Insiya</div>
                  <div className="text-[#F3E3C8]">27 · Hyderabad</div>
                </div>
              </div>
              <div className="px-4 py-2.5 text-[13px] text-muted"><div className="text-primary font-semibold">bohrataaruf.com</div>Tap to see the biodata</div>
            </div>
            <p className="text-[13px] text-muted">What people see in the chat: first name, age, city, blurred photo.</p>
          </div>
        </div>
      </section>

      {/* Stay safe */}
      <section className="container mx-auto max-w-[980px] px-6 pt-16 sm:pt-20">
        <div className="rounded-[28px] bg-[#FBF1D3] px-6 sm:px-12 py-10 sm:py-12">
          <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-primary font-bold">Stay safe</p>
          <h2 className="mt-2 text-2xl sm:text-4xl font-semibold text-[#3F2A16]" style={SERIF}>Before you share, please remember</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-x-9 text-[#5B4308] leading-relaxed">
            {SAFETY_NOTES.map((n, i) => (
              <li key={n} className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-[#C9A24B] text-[#3F2A16] text-xs font-bold inline-flex items-center justify-center">{i + 1}</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto max-w-[1100px] px-6 pt-16 sm:pt-24 pb-6">
        <h2 className="text-center text-3xl sm:text-4xl font-semibold text-foreground" style={SERIF}>Questions people ask</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {FAQS.map((f) => (
            <div key={f.q} className="bg-surface border border-border rounded-2xl px-6 py-5">
              <h3 className="font-bold text-lg text-foreground">{f.q}</h3>
              <p className="mt-2 text-muted leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing */}
      <section className="container mx-auto max-w-[1100px] px-6 py-14 sm:py-20">
        <div className="relative overflow-hidden rounded-[32px] text-white text-center px-6 py-14 sm:py-[72px]" style={{ background: 'linear-gradient(135deg, #3F2A16, #6E4520)' }}>
          <Lattice />
          <div className="relative">
            <h2 className="text-3xl sm:text-5xl font-semibold" style={SERIF}>Ready when you are.</h2>
            <p className="mt-3 max-w-xl mx-auto text-base sm:text-lg text-[#F3E3C8] leading-relaxed">Bohra Taaruf is awaiting Raza Mubarak. Until then, your profile is yours to share.</p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/share" className={goldBtn}>Share now</Link>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={ghostBtn}>Follow @bohrataaruf</a>
            </div>
            <p className="mt-6 text-sm text-[#E8D3A8]">Always check the address: <strong>{SITE_URL.replace('https://', '')}</strong></p>
          </div>
        </div>
      </section>
    </>
  );
}

'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Clock, Mail, Lock, ImageOff, BadgeCheck, ShieldOff, IndianRupee, X, Info, MapPin,
} from 'lucide-react';
import { InstagramIcon } from './InstagramIcon';
import { useLocale } from '@/lib/context/LocaleContext';

// Lisan-ud-Dawat, romanized (not Gujarati script) — matches how the
// community actually writes it day to day, e.g. "Kem Cho?" for "How are
// you?". First-draft translation, only the Story section for now — meant
// to be reviewed/corrected before extending to the rest of the page.
const STORY_TRANSLATIONS = {
  en: {
    label: 'The story',
    headingLines: ['Not a startup.', 'A community response.'],
    paragraph1: `There was a time when a Bohra family looking for a rishta would reach out to the jamaat, ask a trusted elder, or rely on someone who knew someone. It was human. It was free.`,
    paragraph2: `That changed. Platforms emerged, paywalls went up. Seeing who expressed interest became a premium feature. Chatting after a match cost a subscription. The most important decision of a family's life was behind a price tag.`,
    quote: `Matchmaking should never be a business. A fellow momin built Bohra Taaruf so that every family has the same access to this community.`,
    paragraph3: `No investors. No monetisation roadmap. No premium tier. Just a platform built for the community, by someone from the community.`,
  },
  lud: {
    label: 'Amari vaat',
    headingLines: ['Startup nathi.', 'Jamaat no jawab che.'],
    paragraph1: `Ek time hato jyare koi Bohra family rishta maate jamaat pase jati, vishwasu vadil ne puchti, ke pachi jaan-pehchaan vada upar bharosa rakhti. Te insaaniyat hati. Te free hati.`,
    paragraph2: `Pachi progress thayu, ane vachhe technology aavi gayi. Loko have mobile ane nava platforms par vadhu adhar rakhta thaya. Paywalls ubha thaya. Kone interest batavyu e jovu premium feature ban gayu. Match pachi vaat karvani pan subscription mangti hati. Family ni sauthi mahatvni nirnay ek price tag pachal chupayeli hati.`,
    quote: `"Matchmaking kadi business na hovu joiye. Ek sathi momin e Bohra Taaruf banavyu, jethi darek family — pesa hoy ke na hoy — aa jamaat ma same rite pahoncho pame."`,
    paragraph3: `Koi investors nathi. Koi kamai no plan nathi. Koi premium tier nathi. Bas jamaat mateni, jamaat manthi j banaveli ek platform.`,
  },
};

const FEATURES = [
  { Icon: Lock, title: 'Alias until mutual match', body: 'Your real name and photo are only revealed when both sides express interest. Browse privately.' },
  { Icon: ImageOff, title: 'Blurred photos', body: 'Photos are blurred on our servers. 3 views before mutual interest. Not just CSS.' },
  { Icon: BadgeCheck, title: 'ITS verified only', body: 'Every member submits their ITS card. Admin-reviewed. No unverified profiles, ever.' },
  { Icon: MapPin, title: 'Nearby at gatherings', body: "See who's nearby at a Cultural Gathering or meet-up, send a nudge, and chat for a limited window (Coming Soon)" },
  { Icon: ShieldOff, title: 'Screenshot blocked', body: "Profiles can't be screenshotted. What's shared here, stays here." },
  { Icon: IndianRupee, title: 'Free. No exceptions.', body: 'Not freemium. Every feature, every family, always free.' },
];

const STEPS = [
  { title: 'Create your account', body: 'Name, email, and a password. No phone number needed.' },
  { title: 'Complete your profile', body: 'Education, profession, city, family background, and what you’re looking for in a partner.' },
  { title: 'Upload your photo', body: 'Stored privately on our servers. Blurred for anyone browsing until mutual interest.' },
  { title: 'Submit ITS verification', body: 'Upload your ITS card. Our team reviews it. Your verified badge appears once approved.', badge: { text: 'Admin reviewed, not automated', style: 'light' as const } },
  { title: 'Discovery opens', body: "We'll email you the moment we open browsing. Your profile is already complete and ready.", badge: { text: 'Coming soon', style: 'dark' as const } },
];

const MARK_ELEMENTS = [
  {
    label: 'The Arch',
    body: 'From Bohra sacred architecture — the same arch in every masjid and dargah our community holds dear.',
    indicator: <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#C9A96E]" />,
  },
  {
    label: 'The Diamond keystone',
    body: 'The stone that holds the arch together — faith, intention, and family as the foundation.',
    indicator: <span className="mt-1 h-2 w-2 flex-shrink-0 rotate-45 bg-[#C9A96E]" />,
  },
  {
    label: 'The Two Dots',
    body: 'Two souls, equal, inside the same space — present but not yet revealed to each other. Just as taaruf begins.',
    indicator: (
      <span className="mt-1 flex flex-shrink-0 gap-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[#C9A96E]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#C9A96E]" />
      </span>
    ),
  },
  {
    label: 'The Base',
    body: 'Roots. Community. The foundation every family stands on before the door opens.',
    indicator: <span className="mt-2 h-0.5 w-3 flex-shrink-0 rounded-full bg-[#C9A96E]" />,
  },
];

const NEVER_DO = [
  { title: 'Charge to see who liked you', body: 'Knowing who expressed interest is a basic right, not a premium feature.' },
  { title: 'Charge to send or receive messages', body: 'Once matched, you can connect. No paywall between two interested families.' },
  { title: 'Add a premium tier', body: 'No gold memberships, no boosted profiles. Every family gets the same experience.' },
  { title: 'Sell your data', body: 'No advertisers. No third-party brokers. No monetisation of any kind.' },
];

export default function PreLaunchPage() {
  const [registeredCount, setRegisteredCount] = useState<number | null>(null);
  const { locale } = useLocale();
  const story = STORY_TRANSLATIONS[locale];

  const heroGridRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const infoBtnRef = useRef<HTMLButtonElement>(null);
  const isAnimatingRef = useRef(false);
  const runSequenceRef = useRef<() => void>(() => {});

  useEffect(() => {
    fetch('/api/v1/stats/registered')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.count === 'number') setRegisteredCount(data.count);
        else setRegisteredCount(0);
      })
      .catch(() => setRegisteredCount(0));
  }, []);

  // Hero mark construction sequence — the mark's card zooms to center stage
  // (dimmed backdrop, nothing else visible) and builds itself piece by
  // piece, each piece named by a leader-line label as it's drawn. Once
  // built, the box shrinks back into its real spot and the rest of the
  // hero's information (label, quote, description grid) loads in. Runs
  // automatically on load (unless prefers-reduced-motion — the base CSS
  // state in globals.css is already the fully-drawn, fully-visible mark,
  // so nothing is left broken) and can be replayed via the info button.
  useEffect(() => {
    const hero = heroGridRef.current;
    const card = cardRef.current;
    const text = textRef.current;
    const backdrop = backdropRef.current;
    const infoBtn = infoBtnRef.current;
    if (!hero || !card || !text || !backdrop) return undefined;

    let timers: ReturnType<typeof setTimeout>[] = [];
    const after = (ms: number, fn: () => void) => { timers.push(setTimeout(fn, ms)); };

    const runSequence = () => {
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;
      timers.forEach(clearTimeout);
      timers = [];

      const annotItems = Array.from(card.querySelectorAll<SVGGElement>('.hero-annot-item'));
      const fadeItems = Array.from(text.querySelectorAll<HTMLElement>('.mark-fade-item'));
      const iconPieces = Array.from(card.querySelectorAll<SVGElement>('.mark-draw-path, .mark-pop-item'));

      // Force-restart the icon's own CSS draw/pop animation (it already
      // played once and sits at its "forwards" end state) — toggling
      // animation off, forcing a reflow, then back on replays it exactly
      // like a first paint. Not needed on the very first run, but harmless.
      iconPieces.forEach((el) => { el.style.animation = 'none'; });
      void card.offsetWidth;
      iconPieces.forEach((el) => { el.style.animation = ''; });

      annotItems.forEach((el) => { el.style.opacity = '0'; });
      if (infoBtn) infoBtn.style.opacity = '0';

      // Collapse the text block out of layout (not just opacity: 0) so the
      // box's measured height is just the icon + padding — otherwise the
      // space reserved for the quote/grid leaves no room to zoom it up.
      text.style.display = 'none';
      // All the label/quote/grid pieces fade in together once revealed,
      // rather than re-running their original page-load stagger.
      fadeItems.forEach((el) => { el.style.setProperty('--mark-delay', '0s'); });

      card.style.transition = 'none';
      card.style.transform = 'none';
      void card.offsetWidth;

      const heroRect = hero.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const dx = (heroRect.left + heroRect.width / 2) - (cardRect.left + cardRect.width / 2);
      const dy = (heroRect.top + heroRect.height / 2) - (cardRect.top + cardRect.height / 2);
      const scale = Math.min(
        2.2,
        (heroRect.width * 0.8) / cardRect.width,
        (heroRect.height * 0.88) / cardRect.height,
      );

      backdrop.style.transition = 'opacity 0.5s ease';
      backdrop.style.opacity = '1';
      card.style.transformOrigin = 'center center';
      card.style.transition = 'transform 0.5s cubic-bezier(.2,.8,.2,1)';
      card.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;

      // When each named label appears, in ms after the box has finished
      // centering — timed just after that piece starts drawing/popping in
      // (see the --mark-delay values on the icon paths/shapes below), so
      // the label reads as naming what was just built, one at a time.
      const ANNOT_TIMINGS: Array<[string, number]> = [
        ['arch', 900], ['diamond', 1550], ['dots', 1750], ['base', 2000],
      ];
      ANNOT_TIMINGS.forEach(([piece, at]) => {
        const el = annotItems.find((g) => g.dataset.piece === piece);
        if (el) after(520 + at, () => { el.style.opacity = '1'; });
      });

      // The icon's own draw/pop animation (mark-draw-path / mark-pop-item)
      // finishes at its last delay (1.35s) + duration (0.4s) = 1.75s after
      // it starts painting, i.e. once the box has arrived at center. Hold
      // for a full beat so the fully labeled diagram has time to actually
      // be read before it starts closing.
      const CONSTRUCTION_DONE = 1750 + 1400;
      const SETTLE_DURATION = 1500;

      after(520 + CONSTRUCTION_DONE, () => {
        // The leader-line labels stay put — they don't fade out here, so
        // they remain a permanent part of the settled icon, not just a
        // construction-phase flourish.
        backdrop.style.opacity = '0';
        // Restore the text block's layout space (still invisible via its
        // own opacity:0 base state) so the box's natural size already
        // accounts for it — the shrink-back lands at the true resting size
        // instead of settling small then popping taller. Its own fade-in
        // triggers itself.
        text.style.display = '';
        card.style.transition = `transform ${SETTLE_DURATION / 1000}s cubic-bezier(.3,.7,.2,1)`;
        card.style.transform = 'none';
      });

      after(520 + CONSTRUCTION_DONE + SETTLE_DURATION * 0.4, () => {
        if (infoBtn) infoBtn.style.opacity = '1';
      });

      after(520 + CONSTRUCTION_DONE + SETTLE_DURATION + 100, () => {
        isAnimatingRef.current = false;
      });
    };

    runSequenceRef.current = runSequence;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced) runSequence();
    else if (infoBtn) infoBtn.style.opacity = '1';

    // Reset the guard on cleanup too — React 18 StrictMode double-invokes
    // effects in dev (mount, cleanup, mount again), and isAnimatingRef is a
    // ref, so it survives that cleanup. Without resetting it here, the
    // second (real) mount's runSequence() call sees isAnimatingRef still
    // true from the first, aborts immediately, and the DOM is left stuck
    // mid-zoom with no timers ever scheduled to finish the sequence.
    return () => {
      timers.forEach(clearTimeout);
      isAnimatingRef.current = false;
    };
  }, []);

  return (
    <div className="flex flex-col">
      {/* SECTION 1: HERO */}
      <section
        className="relative w-full"
        style={{ backgroundColor: '#211F1A' }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(201,169,110,0.07) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div
          ref={heroGridRef}
          className="relative mx-auto grid grid-cols-1 items-center gap-12 md:grid-cols-2 md:gap-10"
          style={{ maxWidth: '1080px', padding: '48px 24px' }}
        >
          {/* Dims the whole hero (pitch text included) while the mark's
              card is zoomed to center stage constructing itself — faded
              back out once it settles into place. */}
          <div
            ref={backdropRef}
            className="pointer-events-none absolute inset-0 z-10 opacity-0"
            style={{ backgroundColor: 'rgba(10,9,7,0.72)' }}
          />

          {/* LEFT — pitch */}
          <div style={{ textAlign: 'left' }}>
            <div className="inline-flex items-center mb-6" style={{ gap: '8px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#C9A96E', display: 'inline-block' }} />
              <span className="text-xs tracking-widest uppercase" style={{ color: '#C9A96E' }}>
                Exclusively for Dawoodi Bohra families
              </span>
            </div>

            <h1 className="font-serif text-4xl md:text-5xl font-medium leading-tight" style={{ color: '#FFFFFC', marginBottom: '20px' }}>
              Marriage is one of life&apos;s most sacred moments. It should never cost you anything.
            </h1>

            <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '32px', maxWidth: '480px' }}>
              Watching matchmaking become a business — inaccessible for many in our own community — a fellow momin decided to do something about it. Bohra Taaruf is free, private, and built on trust.
            </p>

            <div className="flex flex-wrap" style={{ gap: '12px' }}>
              {[
                { value: registeredCount === null ? '—' : `${registeredCount}+`, label: 'families registered' },
                { value: '₹0', label: 'now and forever' },
                { value: '100%', label: 'ITS verified only' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '0.5px solid rgba(201,169,110,0.2)',
                    padding: '14px 20px',
                    minWidth: '130px',
                  }}
                >
                  <div className="font-serif text-2xl font-medium" style={{ color: '#C9A96E' }}>{stat.value}</div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — the mark (logo relevance). The logo is inlined (not
              <img src>) specifically so its strokes can be animated —
              draws itself in on load, then each symbolic element pops in,
              in the order it was just drawn. See the mark-* keyframes in
              globals.css; default state (no JS, reduced motion) is just
              the fully-drawn mark, always. The JS effect above wraps this
              in a zoom-to-center construction sequence when motion is
              allowed — see the annotation overlay just after the icon. */}
          <div ref={cardRef} className="relative z-20 overflow-hidden rounded-2xl border border-white/10 bg-[#2A2620] p-8">
            <button
              ref={infoBtnRef}
              type="button"
              onClick={() => runSequenceRef.current()}
              aria-label="Replay the mark's construction animation"
              title="Replay animation"
              className="absolute right-4 top-4 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/40 opacity-0 transition-colors hover:border-[#C9A96E] hover:text-[#C9A96E]"
            >
              <Info size={13} />
            </button>
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="relative inline-block">
                <svg width="100" height="131" viewBox="0 0 110 145" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="markGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C9A96E" />
                    <stop offset="100%" stopColor="#8C6A3F" />
                  </linearGradient>
                </defs>
                <polygon
                  className="mark-pop-item"
                  style={{ transformOrigin: '55px 13px', '--mark-delay': '0.95s' } as React.CSSProperties}
                  points="55,8 59,13 55,18 51,13" fill="url(#markGradient)"
                />
                <path
                  className="mark-draw-path"
                  style={{ '--mark-dash': 260, '--mark-delay': '0.1s' } as React.CSSProperties}
                  d="M20,118 L20,55 Q20,18 55,18 Q90,18 90,55 L90,118" fill="none" stroke="url(#markGradient)" strokeWidth="2.2" strokeLinecap="round"
                />
                <path
                  className="mark-draw-path"
                  style={{ '--mark-dash': 250, '--mark-delay': '0.3s' } as React.CSSProperties}
                  d="M25,118 L25,57 Q25,23 55,23 Q85,23 85,57 L85,118" fill="none" stroke="#C9A96E" strokeWidth="0.9" strokeLinecap="round" opacity="0.45"
                />
                <circle className="mark-pop-item" style={{ transformOrigin: '42px 85px', '--mark-delay': '1.05s' } as React.CSSProperties} cx="42" cy="85" r="7" fill="#C9A96E" opacity="0.45" />
                <circle className="mark-pop-item" style={{ transformOrigin: '68px 85px', '--mark-delay': '1.15s' } as React.CSSProperties} cx="68" cy="85" r="7" fill="#C9A96E" opacity="0.45" />
                <rect className="mark-pop-item" style={{ transformOrigin: '55px 121.5px', '--mark-delay': '1.3s' } as React.CSSProperties} x="12" y="120" width="86" height="3" rx="1.5" fill="url(#markGradient)" />
                <rect className="mark-pop-item" style={{ transformOrigin: '55px 125px', '--mark-delay': '1.35s' } as React.CSSProperties} x="8" y="124" width="94" height="2" rx="1" fill="#C9A96E" opacity="0.4" />
                </svg>
                {/* Construction call-outs — shares the icon's own 0-110 /
                    0-145 coordinate space (extended with margin) so each
                    leader line stays pinned to the exact feature it names
                    at any zoom level, since it scales together with the
                    icon as a descendant of the same card transform. Only
                    ever visible while the JS effect is actively running
                    the construction phase (opacity: 0 otherwise). */}
                <svg
                  className="pointer-events-none absolute"
                  style={{ left: '-86px', top: '-18px', width: '291px', height: '173px' }}
                  viewBox="-95 -20 320 190"
                  aria-hidden="true"
                >
                  <g className="hero-annot-item" data-piece="arch" style={{ opacity: 0, transition: 'opacity 0.35s ease' }}>
                    <circle cx="20" cy="58" r="2.3" fill="#C9A96E" />
                    <line x1="20" y1="58" x2="-14" y2="58" stroke="#C9A96E" strokeWidth="1.3" />
                    <text x="-18" y="61.5" textAnchor="end" fontSize="14" fontWeight={700} fill="#E8C583">The Arch</text>
                  </g>
                  <g className="hero-annot-item" data-piece="diamond" style={{ opacity: 0, transition: 'opacity 0.35s ease' }}>
                    <circle cx="58" cy="10" r="2.3" fill="#C9A96E" />
                    <line x1="58" y1="10" x2="84" y2="-6" stroke="#C9A96E" strokeWidth="1.3" />
                    <text x="88" y="-2.5" textAnchor="start" fontSize="14" fontWeight={700} fill="#E8C583">The Diamond</text>
                  </g>
                  <g className="hero-annot-item" data-piece="dots" style={{ opacity: 0, transition: 'opacity 0.35s ease' }}>
                    <circle cx="68" cy="85" r="2.3" fill="#C9A96E" />
                    <line x1="68" y1="85" x2="94" y2="92" stroke="#C9A96E" strokeWidth="1.3" />
                    <text x="98" y="95.5" textAnchor="start" fontSize="14" fontWeight={700} fill="#E8C583">The Two Dots</text>
                  </g>
                  <g className="hero-annot-item" data-piece="base" style={{ opacity: 0, transition: 'opacity 0.35s ease' }}>
                    <circle cx="12" cy="122" r="2.3" fill="#C9A96E" />
                    <line x1="12" y1="122" x2="-14" y2="130" stroke="#C9A96E" strokeWidth="1.3" />
                    <text x="-18" y="133.5" textAnchor="end" fontSize="14" fontWeight={700} fill="#E8C583">The Base</text>
                  </g>
                </svg>
              </div>
              <div ref={textRef} className="min-w-0 w-full">
                <span
                  className="mark-fade-item mb-2 block text-xs font-semibold uppercase tracking-widest text-[#C9A96E]"
                  style={{ '--mark-delay': '1.5s' } as React.CSSProperties}
                >
                  The mark
                </span>
                <p
                  className="mark-fade-item mb-3 font-serif text-sm italic leading-relaxed text-[#FFFFFC]"
                  style={{ '--mark-delay': '1.6s' } as React.CSSProperties}
                >
                  &quot;The arch from our own sacred architecture. The keystone that holds everything together. Two souls inside, not yet revealed. The door through which every taaruf begins.&quot;
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {MARK_ELEMENTS.map((el, i) => (
                    <div
                      key={el.label}
                      className="mark-fade-item flex min-w-0 items-start gap-2"
                      style={{ '--mark-delay': `${1.75 + i * 0.12}s` } as React.CSSProperties}
                    >
                      {el.indicator}
                      <div className="min-w-0">
                        <div className="mb-0.5 text-xs font-semibold text-[#C9A96E]">{el.label}</div>
                        <div className="text-xs leading-relaxed text-white/50">{el.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1B: PULL QUOTE — standalone, sits right below the hero */}
      <section style={{ backgroundColor: '#EADFCB', padding: '38px 24px' }}>
        <p
          className="font-serif italic text-center leading-relaxed mx-auto"
          style={{ color: '#3A2E1E', fontSize: '20px', maxWidth: '760px' }}
        >
          {story.quote}
        </p>
      </section>

      {/* SECTION 2: STORY + THE MARK + CTAs */}
      <section style={{ backgroundColor: '#FFFFFC' }}>
        {/* 2A — Founding story */}
        <div className="px-6 py-10 md:px-12 md:py-16">
          <div className="mx-auto" style={{ maxWidth: '1080px' }}>
            <span className="mb-3 block text-xs font-semibold uppercase tracking-widest text-[#8C6A3F]">
              {story.label}
            </span>
            <h2 className="mb-5 font-serif text-3xl font-medium leading-snug text-[#211F1A]">
              {story.headingLines[0]}<br />{story.headingLines[1]}
            </h2>

            <div className="mb-8 grid grid-cols-1 gap-7 md:grid-cols-2">
              <p className="text-base leading-relaxed text-[#5C4425]">{story.paragraph1}</p>
              <p className="text-base leading-relaxed text-[#5C4425]">{story.paragraph2}</p>
            </div>

            <p className="text-base leading-relaxed text-[#5C4425]">{story.paragraph3}</p>
          </div>
        </div>

        {/* 2B — CTAs */}
        <div className="mx-auto" style={{ maxWidth: '1080px' }}>
          <div className="mx-6 mt-5 mb-8 grid grid-cols-1 gap-4 md:mx-8 md:grid-cols-2">
            {/* Create your profile */}
            <div className="flex flex-col gap-3 rounded-2xl border border-[#E5E0D8] bg-[#FFFFFC] p-6">
              <div className="mb-1 inline-flex w-fit items-center gap-1.5 rounded-full border border-[rgba(201,169,110,0.25)] bg-[rgba(201,169,110,0.12)] px-2.5 py-1">
                <Clock className="text-xs text-[#C9A96E]" size={13} />
                <span className="text-xs text-[#C9A96E]">Building community first</span>
              </div>

              <h3 className="font-serif text-lg font-medium leading-snug text-[#211F1A]">
                Create your profile
              </h3>
              <p className="text-sm leading-relaxed text-[#6B6558]">
                Discovery opens once we have a meaningful number of verified families. Complete your profile now — you&apos;ll be ready the moment it does.
              </p>

              <Link
                href="/signup"
                className="mt-auto flex h-11 w-full items-center justify-center rounded-xl bg-[#8C6A3F] text-center text-sm font-medium text-[#FFFFFC] transition-colors hover:bg-[#6B4C2A]"
              >
                Start your taaruf — it&apos;s free →
              </Link>

              <p className="mt-1 text-center text-xs text-[#A09080]">
                No credit card. No subscription. No paid tiers — ever.
              </p>
            </div>

            {/* Stay in the loop */}
            <div className="relative flex flex-col gap-3 overflow-hidden rounded-2xl bg-[#211F1A] p-6">
              <div
                className="pointer-events-none absolute inset-0 z-0"
                style={{
                  backgroundImage: 'radial-gradient(circle, rgba(201,169,110,0.07) 1px, transparent 1px)',
                  backgroundSize: '22px 22px',
                }}
              />
              <div className="relative z-10 flex flex-col gap-3">
                <h3 className="mb-1 font-serif text-lg font-medium text-[#FFFFFC]">
                  Stay in the loop
                </h3>
                <p className="mb-2 text-sm leading-relaxed text-white/50">
                  We share updates on Instagram and by email. When discovery opens, you&apos;ll be the first to know.
                </p>

                <div className="flex flex-col gap-2">
                  <a
                    href="https://instagram.com/bohrataaruf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs text-white/70 transition-colors hover:border-[#C9A96E] hover:text-[#C9A96E]"
                  >
                    <InstagramIcon />
                    <span>@bohrataaruf on Instagram</span>
                  </a>
                  <a
                    href="mailto:support@bohrataaruf.com"
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs text-white/70 transition-colors hover:border-[#C9A96E] hover:text-[#C9A96E]"
                  >
                    <Mail size={14} />
                    <span>Get email updates</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: WHY DIFFERENT — this is the "Features" the header's
          /#features link scrolls to; there's no section literally titled
          "Features" on this page, this is its equivalent. */}
      <section id="features" style={{ backgroundColor: '#F8F5F0', padding: '64px 24px' }}>
        <div className="mx-auto" style={{ maxWidth: '1080px' }}>
          <span className="block text-xs tracking-widest uppercase" style={{ color: '#8C6A3F', marginBottom: '14px' }}>
            Why different
          </span>
          <h2 className="font-serif text-3xl font-medium" style={{ color: '#211F1A', maxWidth: '440px', marginBottom: '8px' }}>
            Built on principles, not a business model
          </h2>
          <p className="text-base leading-relaxed" style={{ color: '#6B6558', maxWidth: '500px' }}>
            Every decision about how this platform works comes from one question: what&apos;s right for our community?
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: '16px', marginTop: '40px' }}>
            {FEATURES.map(({ Icon, title, body }) => (
              <div key={title} className="rounded-xl" style={{ backgroundColor: '#FFFFFC', border: '0.5px solid #E5E0D8', padding: '20px' }}>
                <div className="flex items-center justify-center rounded-full" style={{ width: '36px', height: '36px', backgroundColor: '#EADFCB', marginBottom: '12px' }}>
                  <Icon size={17} color="#8C6A3F" />
                </div>
                <div className="text-sm font-medium" style={{ color: '#211F1A', marginBottom: '5px' }}>{title}</div>
                <div className="text-xs leading-relaxed" style={{ color: '#6B6558' }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: HOW IT WORKS + NEVER DO */}
      <section id="how-it-works" style={{ backgroundColor: '#FFFFFC', padding: '64px 24px' }}>
        <div className="mx-auto grid grid-cols-1 md:grid-cols-2" style={{ maxWidth: '1080px', gap: '48px' }}>
          {/* LEFT — How it works */}
          <div>
            <span className="block text-xs tracking-widest uppercase" style={{ color: '#8C6A3F', marginBottom: '14px' }}>
              How it works
            </span>
            <h2 className="font-serif text-3xl font-medium" style={{ color: '#211F1A', marginBottom: '8px' }}>
              The full signup — nothing held back
            </h2>
            <p className="text-base leading-relaxed" style={{ color: '#6B6558', marginBottom: '24px' }}>
              We ask for the full profile now so your first experience of discovery is genuinely useful — not an empty room.
            </p>

            <div className="flex flex-col">
              {STEPS.map((step, idx) => (
                <div
                  key={step.title}
                  className="flex"
                  style={{
                    gap: '20px',
                    alignItems: 'flex-start',
                    padding: '20px 0',
                    borderBottom: idx < STEPS.length - 1 ? '0.5px solid #E5E0D8' : 'none',
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded-full shrink-0 text-sm font-medium"
                    style={{
                      width: '32px',
                      height: '32px',
                      marginTop: '2px',
                      backgroundColor: idx < 4 ? '#8C6A3F' : '#EADFCB',
                      color: idx < 4 ? '#FFFFFC' : '#8C6A3F',
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <div className="text-base font-medium" style={{ color: '#211F1A', marginBottom: '4px' }}>{step.title}</div>
                    <div className="text-sm leading-relaxed" style={{ color: '#6B6558' }}>{step.body}</div>
                    {step.badge && (
                      <span
                        className="inline-block text-xs"
                        style={{
                          borderRadius: '999px',
                          padding: '2px 8px',
                          marginTop: '6px',
                          backgroundColor: step.badge.style === 'dark' ? '#211F1A' : '#EADFCB',
                          color: step.badge.style === 'dark' ? '#C9A96E' : '#5C4425',
                        }}
                      >
                        {step.badge.text}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — What we will never do */}
          <div>
            <span className="block text-xs tracking-widest uppercase" style={{ color: '#8C6A3F', marginBottom: '14px' }}>
              Our promise
            </span>
            <h2 className="font-serif text-3xl font-medium" style={{ color: '#211F1A', marginBottom: '8px' }}>
              What we will never do
            </h2>

            <div className="flex flex-col" style={{ gap: '14px', marginTop: '8px' }}>
              {NEVER_DO.map((item) => (
                <div
                  key={item.title}
                  className="flex rounded-lg"
                  style={{
                    backgroundColor: '#FFF5F5',
                    border: '0.5px solid #F0C0C0',
                    padding: '14px',
                    gap: '12px',
                    alignItems: 'flex-start',
                  }}
                >
                  <X size={18} color="#C0392B" className="shrink-0" style={{ marginTop: '1px' }} />
                  <div>
                    <div className="text-sm font-medium" style={{ color: '#7B1111', marginBottom: '2px' }}>{item.title}</div>
                    <div className="text-xs leading-relaxed" style={{ color: '#993333' }}>{item.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

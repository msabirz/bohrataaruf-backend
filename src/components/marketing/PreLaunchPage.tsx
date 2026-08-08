'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Clock, Mail, Lock, ImageOff, BadgeCheck, MapPin, ShieldOff, IndianRupee, X,
} from 'lucide-react';
import { InstagramIcon } from './InstagramIcon';

const FEATURES = [
  { Icon: Lock, title: 'Alias until mutual match', body: 'Your real name and photo are only revealed when both sides express interest. Browse privately.' },
  { Icon: ImageOff, title: 'Blurred photos', body: 'Photos are blurred on our servers. 3 views before mutual interest. Not just CSS.' },
  { Icon: BadgeCheck, title: 'ITS verified only', body: 'Every member submits their ITS card. Admin-reviewed. No unverified profiles, ever.' },
  { Icon: MapPin, title: 'Nearby at gatherings', body: 'Meet at Ashara, Majlis, or Urus with a nudge feature built for community gatherings.' },
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

const NEVER_DO = [
  { title: 'Charge to see who liked you', body: 'Knowing who expressed interest is a basic right, not a premium feature.' },
  { title: 'Charge to send or receive messages', body: 'Once matched, you can connect. No paywall between two interested families.' },
  { title: 'Add a premium tier', body: 'No gold memberships, no boosted profiles. Every family gets the same experience.' },
  { title: 'Sell your data', body: 'No advertisers. No third-party brokers. No monetisation of any kind.' },
];

export default function PreLaunchPage() {
  const [registeredCount, setRegisteredCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/v1/stats/registered')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.count === 'number') setRegisteredCount(data.count);
        else setRegisteredCount(0);
      })
      .catch(() => setRegisteredCount(0));
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
          className="relative mx-auto"
          style={{ maxWidth: '580px', textAlign: 'left', padding: '72px 24px' }}
        >
          <div className="inline-flex items-center mb-6" style={{ gap: '8px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#C9A96E', display: 'inline-block' }} />
            <span style={{ fontSize: '11px', color: '#C9A96E', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              Exclusively for Dawoodi Bohra families
            </span>
          </div>

          <h1 className="font-serif" style={{ fontSize: '42px', color: '#FFFFFC', lineHeight: 1.2, marginBottom: '20px' }}>
            Marriage is one of life&apos;s most sacred moments. It should never cost you anything.
          </h1>

          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.75, marginBottom: '32px', maxWidth: '480px' }}>
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
                <div className="font-serif" style={{ fontSize: '22px', color: '#C9A96E' }}>{stat.value}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 2: STORY + CTA */}
      <section style={{ backgroundColor: '#FFFFFC', padding: '64px 24px' }}>
        <div className="mx-auto grid grid-cols-1 md:grid-cols-2 items-start" style={{ maxWidth: '1080px', gap: '48px' }}>
          {/* LEFT COLUMN */}
          <div>
            <span className="block" style={{ fontSize: '11px', color: '#8C6A3F', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '14px' }}>
              The story
            </span>
            <h2 className="font-serif" style={{ fontSize: '28px', color: '#211F1A', lineHeight: 1.3, marginBottom: '16px' }}>
              Not a startup.<br />A community response.
            </h2>

            <p style={{ fontSize: '14px', color: '#5C4425', lineHeight: 1.75, marginBottom: '16px' }}>
              There was a time when a Bohra family looking for a rishta would reach out to the jamaat, ask a trusted elder, or rely on someone who knew someone. It was human. It was free.
            </p>
            <p style={{ fontSize: '14px', color: '#5C4425', lineHeight: 1.75, marginBottom: '16px' }}>
              That changed. Platforms emerged, paywalls went up. Seeing who expressed interest became a premium feature. Chatting after a match cost a subscription. The most important decision of a family&apos;s life was behind a price tag.
            </p>

            <div style={{ borderLeft: '2px solid #C9A96E', backgroundColor: '#EADFCB', borderRadius: '0 8px 8px 0', padding: '16px 20px', margin: '20px 0' }}>
              <p className="font-serif italic" style={{ fontSize: '15px', color: '#3A2E1E', lineHeight: 1.6, margin: 0 }}>
                &quot;Matchmaking should never be a business. A fellow momin built Bohra Taaruf so that every family — regardless of means — has the same access to this community.&quot;
              </p>
            </div>

            <p style={{ fontSize: '14px', color: '#5C4425', lineHeight: 1.75, marginBottom: '16px' }}>
              No investors. No monetisation roadmap. No premium tier. Just a platform built for the community, by someone from the community.
            </p>
          </div>

          {/* RIGHT COLUMN */}
          <div>
            <div className="rounded-2xl" style={{ backgroundColor: '#FFFFFC', border: '0.5px solid #E5E0D8', padding: '32px' }}>
              <div className="inline-flex items-center" style={{ gap: '6px', backgroundColor: 'rgba(201,169,110,0.12)', border: '0.5px solid rgba(201,169,110,0.25)', borderRadius: '999px', padding: '4px 10px', fontSize: '11px', color: '#C9A96E', marginBottom: '16px' }}>
                <Clock size={13} color="#C9A96E" />
                Building community first
              </div>

              <h3 className="font-serif" style={{ fontSize: '18px', color: '#211F1A', marginBottom: '6px' }}>
                Create your profile
              </h3>
              <p style={{ fontSize: '13px', color: '#6B6558', lineHeight: 1.6, marginBottom: '24px' }}>
                Discovery opens once we have a meaningful number of verified families. Complete your profile now — you&apos;ll be ready the moment it does.
              </p>

              <Link
                href="/signup"
                className="w-full flex items-center justify-center"
                style={{
                  height: '44px',
                  backgroundColor: '#8C6A3F',
                  color: '#FFFFFC',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  border: 'none',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#6B4C2A'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#8C6A3F'; }}
              >
                Start your taaruf — it&apos;s free →
              </Link>

              <p style={{ fontSize: '11px', color: '#A09080', textAlign: 'center', marginTop: '12px', lineHeight: 1.5 }}>
                No credit card. No subscription. No paid tiers — ever.
              </p>
            </div>

            <div className="rounded-xl text-center" style={{ marginTop: '16px', backgroundColor: '#211F1A', padding: '20px 24px' }}>
              <h4 style={{ fontSize: '14px', color: '#FFFFFC', fontWeight: 500, marginBottom: '6px' }}>
                Stay in the loop
              </h4>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: '14px' }}>
                We share updates on Instagram and by email. When we&apos;re ready to open discovery, you&apos;ll be the first to know.
              </p>
              <div className="flex justify-center flex-wrap" style={{ gap: '10px' }}>
                <a
                  href="https://instagram.com/bohrataaruf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center"
                  style={{ gap: '6px', border: '0.5px solid rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', fontSize: '12px', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', transition: 'color 0.2s, border-color 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#C9A96E'; e.currentTarget.style.color = '#C9A96E'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                >
                  <InstagramIcon />
                  @bohrataaruf
                </a>
                <a
                  href="mailto:hello@bohrataaruf.com"
                  className="inline-flex items-center"
                  style={{ gap: '6px', border: '0.5px solid rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', fontSize: '12px', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', transition: 'color 0.2s, border-color 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#C9A96E'; e.currentTarget.style.color = '#C9A96E'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                >
                  <Mail size={13} />
                  Email updates
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: WHY DIFFERENT */}
      <section style={{ backgroundColor: '#F8F5F0', padding: '64px 24px' }}>
        <div className="mx-auto" style={{ maxWidth: '1080px' }}>
          <span className="block" style={{ fontSize: '11px', color: '#8C6A3F', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '14px' }}>
            Why different
          </span>
          <h2 className="font-serif" style={{ fontSize: '28px', color: '#211F1A', maxWidth: '440px', marginBottom: '8px' }}>
            Built on principles, not a business model
          </h2>
          <p style={{ fontSize: '14px', color: '#6B6558', maxWidth: '500px', lineHeight: 1.7 }}>
            Every decision about how this platform works comes from one question: what&apos;s right for our community?
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: '16px', marginTop: '40px' }}>
            {FEATURES.map(({ Icon, title, body }) => (
              <div key={title} className="rounded-xl" style={{ backgroundColor: '#FFFFFC', border: '0.5px solid #E5E0D8', padding: '20px' }}>
                <div className="flex items-center justify-center rounded-full" style={{ width: '36px', height: '36px', backgroundColor: '#EADFCB', marginBottom: '12px' }}>
                  <Icon size={17} color="#8C6A3F" />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#211F1A', marginBottom: '5px' }}>{title}</div>
                <div style={{ fontSize: '12px', color: '#6B6558', lineHeight: 1.5 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: HOW IT WORKS + NEVER DO */}
      <section style={{ backgroundColor: '#FFFFFC', padding: '64px 24px' }}>
        <div className="mx-auto grid grid-cols-1 md:grid-cols-2" style={{ maxWidth: '1080px', gap: '48px' }}>
          {/* LEFT — How it works */}
          <div>
            <span className="block" style={{ fontSize: '11px', color: '#8C6A3F', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '14px' }}>
              How it works
            </span>
            <h2 className="font-serif" style={{ fontSize: '28px', color: '#211F1A', marginBottom: '8px' }}>
              The full signup — nothing held back
            </h2>
            <p style={{ fontSize: '14px', color: '#6B6558', lineHeight: 1.7, marginBottom: '24px' }}>
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
                    className="flex items-center justify-center rounded-full shrink-0"
                    style={{
                      width: '32px',
                      height: '32px',
                      marginTop: '2px',
                      fontSize: '13px',
                      fontWeight: 500,
                      backgroundColor: idx < 4 ? '#8C6A3F' : '#EADFCB',
                      color: idx < 4 ? '#FFFFFC' : '#8C6A3F',
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#211F1A', marginBottom: '4px' }}>{step.title}</div>
                    <div style={{ fontSize: '13px', color: '#6B6558', lineHeight: 1.55 }}>{step.body}</div>
                    {step.badge && (
                      <span
                        className="inline-block"
                        style={{
                          borderRadius: '999px',
                          padding: '2px 8px',
                          fontSize: '10px',
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
            <span className="block" style={{ fontSize: '11px', color: '#8C6A3F', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '14px' }}>
              Our promise
            </span>
            <h2 className="font-serif" style={{ fontSize: '28px', color: '#211F1A', marginBottom: '8px' }}>
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
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#7B1111', marginBottom: '2px' }}>{item.title}</div>
                    <div style={{ fontSize: '12px', color: '#993333', lineHeight: 1.4 }}>{item.body}</div>
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

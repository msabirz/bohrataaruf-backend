import React from 'react';
import Link from 'next/link';
import { CARD_NAME, CARD_PATH } from '@/lib/share/campaignContent';

/** Shared frame for the plain content pages (How it works, Glossary, FAQ, blog). */
export function ContentPage({ title, intro, children, jsonLd }: { title: string; intro?: string; children: React.ReactNode; jsonLd?: object[] }) {
  return (
    <div className="bg-background min-h-screen pt-24 pb-24 px-6">
      {(jsonLd ?? []).map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d).replace(/</g, '\\u003c') }} />
      ))}
      <div className="container mx-auto max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{title}</h1>
        {intro && <p className="text-lg text-muted leading-relaxed mb-10">{intro}</p>}
        {children}
        <CardCallout />
      </div>
    </div>
  );
}

/** A gentle pointer to the Smart Taaruf Card at the end of every content page. */
export function CardCallout() {
  return (
    <div className="mt-14 rounded-2xl border-2 border-[#C9A24B] bg-[#FFF9EA] p-6 md:flex md:items-center md:gap-6">
      <div className="flex-1">
        <h2 className="text-lg font-bold text-[#211F1A]">{CARD_NAME}</h2>
        <p className="mt-1 text-sm leading-relaxed text-[#4A4036]">Your biodata as a private link you control. You choose what shows, and you can switch it off any time. Free.</p>
      </div>
      <Link href={CARD_PATH} className="mt-4 inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full bg-[#8C6A3F] px-6 text-sm font-semibold text-[#FFFFFC] transition-colors hover:bg-[#7a5b35] md:mt-0">
        See how it works &rarr;
      </Link>
    </div>
  );
}

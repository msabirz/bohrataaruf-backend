import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Search, Heart, Users, ShieldOff, EyeOff, Lock, MessageCircleOff, Link as LinkIcon, Eye, Zap, MapPin } from 'lucide-react';
import IndiaMap from '@/components/marketing/IndiaMap';

const APP_NAME = process.env.APP_DISPLAY_NAME ?? 'Bohra Taaruf';

export default function MarketingHomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. HERO SECTION */}
      <section className="relative pt-24 pb-32 overflow-hidden px-6">
        <div className="absolute inset-0 bg-background -z-20" />
        
        {/* Subtle Bronze Dot Matrix Pattern */}
        <div 
          className="absolute inset-0 -z-10 opacity-30 parallax-bg"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #C9A96E 1px, transparent 0)`,
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(circle at top center, black 0%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(circle at top center, black 0%, transparent 80%)'
          }}
        />
        
        <div className="container mx-auto max-w-6xl scroll-reveal grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-left">
            <span className="inline-block py-1 px-3 rounded-full bg-accent-light/50 text-primary font-medium text-sm mb-6 border border-accent/20">
              Exclusively for the Dawoodi Bohra Community
            </span>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6 leading-tight">
              Find your match with <span className="text-primary">trust</span> and <span className="text-primary">privacy</span>.
            </h1>
            <p className="text-lg md:text-xl text-muted max-w-2xl mb-8">
              A thoughtful space designed for meaningful connections, built entirely around ITS verification and strict privacy controls.
            </p>
            
            <Link href="/signup" className="inline-block bg-primary text-surface font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity shadow-lg text-lg">
              Join {APP_NAME}
            </Link>
          </div>
          
          <div className="relative hidden md:block">
            <IndiaMap />
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-surface/80 backdrop-blur-md border border-border px-4 py-2 rounded-full text-xs font-medium text-muted shadow-sm whitespace-nowrap">
              Active members across India
            </div>
          </div>
        </div>
      </section>

      {/* 2. OUR CAUSE (NEW) */}
      <section className="py-24 bg-surface px-6">
        <div className="container mx-auto max-w-4xl text-center scroll-reveal">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">
            This isn't a business. It's a response to a real problem.
          </h2>
          <div className="text-lg md:text-xl text-muted leading-relaxed space-y-6 text-left">
            <p>
              Finding a spouse within our own community has quietly gotten harder — smaller local networks, families spread across cities and countries, and a real hesitation around traditional introductions that don't always respect people's dignity or privacy.
            </p>
            <p>
              {APP_NAME} was built to close that gap — not to profit from it. There's no subscription because there shouldn't be a price tag on helping two people from our community find each other. This is a genuine attempt to make that easier, safer, and more dignified, for our sons and daughters both.
            </p>
          </div>
        </div>
      </section>

      {/* 3. FEATURES (UPDATED) */}
      <section id="features" className="py-24 bg-background border-y border-border px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            <div className="bg-surface p-8 rounded-2xl border border-border scroll-reveal">
              <div className="w-12 h-12 bg-accent-light rounded-full flex items-center justify-center mb-6">
                <LinkIcon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">One-time biodata link</h3>
              <p className="text-muted leading-relaxed">Families have shared paper biodatas for generations. We've made that digital and safer: generate a single shareable link, valid for one view or 24 hours, so you can send your biodata the traditional way — without it circulating forever once it's out of your hands.</p>
            </div>
            
            <div className="bg-surface p-8 rounded-2xl border border-border scroll-reveal" style={{ animationDelay: '100ms' }}>
              <div className="w-12 h-12 bg-accent-light rounded-full flex items-center justify-center mb-6">
                <Eye className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Protected profile photos</h3>
              <p className="text-muted leading-relaxed">Your photo stays blurred until someone earns a real, limited look — never fully public, never something a stranger can casually browse.</p>
            </div>
            
            <div className="bg-surface p-8 rounded-2xl border border-border scroll-reveal" style={{ animationDelay: '200ms' }}>
              <div className="w-12 h-12 bg-accent-light rounded-full flex items-center justify-center mb-6">
                <ShieldOff className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">No screenshots</h3>
              <p className="text-muted leading-relaxed">We actively block screenshot attempts on profile photos, and notify you if someone tries. Your image was never meant to end up saved on someone else's phone.</p>
            </div>

            <div className="bg-surface p-8 rounded-2xl border border-border scroll-reveal" style={{ animationDelay: '300ms' }}>
              <div className="w-12 h-12 bg-accent-light rounded-full flex items-center justify-center mb-6">
                <MessageCircleOff className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">No in-app chat, by design</h3>
              <p className="text-muted leading-relaxed">Once you match, you exchange the social handle you're comfortable sharing — Instagram, Snapchat — and take the conversation to a space you already trust, on your own terms.</p>
            </div>

            <div className="bg-surface p-8 rounded-2xl border border-border scroll-reveal" style={{ animationDelay: '400ms' }}>
              <div className="w-12 h-12 bg-accent-light rounded-full flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Match percentage</h3>
              <p className="text-muted leading-relaxed">See, at a glance, how genuinely compatible you are based on what actually matters to you — not just a photo grid.</p>
            </div>

            <div className="bg-surface p-8 rounded-2xl border border-border scroll-reveal" style={{ animationDelay: '500ms' }}>
              <div className="w-12 h-12 bg-accent-light rounded-full flex items-center justify-center mb-6">
                <Search className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Search by city and location</h3>
              <p className="text-muted leading-relaxed">Find people from your own city, or open your search to the wider global Bohra community — your choice.</p>
            </div>

            {/* Coming Soon Feature */}
            <div className="bg-surface p-8 rounded-2xl border border-border scroll-reveal lg:col-span-3 flex flex-col md:flex-row items-center gap-6" style={{ animationDelay: '600ms' }}>
              <div className="w-12 h-12 bg-border rounded-full flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6 text-muted" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-muted">Nearby profile discovery</h3>
                  <span className="bg-accent-light/50 text-primary text-xs font-bold px-3 py-1 rounded-full border border-accent/20 tracking-wide uppercase">Coming Soon</span>
                </div>
                <p className="text-muted leading-relaxed">See who's genuinely close to you, so distance is never the reason a good match gets missed.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section id="how-it-works" className="py-24 bg-background px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16 scroll-reveal">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-lg text-muted">A simple, dignified process to find your match.</p>
          </div>
          
          <div className="relative border-l-2 border-border/40 md:border-transparent ml-4 md:ml-0">
            {/* Timeline center line for desktop */}
            <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-px bg-border/60 -translate-x-1/2" />
            
            {[
              { icon: ShieldCheck, title: 'Verify your identity', desc: 'Sign up securely using your ITS number. Our team reviews every profile.' },
              { icon: Search, title: 'Browse thoughtfully', desc: 'Explore curated profiles. Names are hidden and photos are protected.' },
              { icon: Heart, title: 'Express interest', desc: 'When you find someone compatible, send them an interest securely.' },
              { icon: Users, title: 'Mutual match', desc: 'If they like you back, real names are revealed and you can connect.' }
            ].map((item, idx) => {
              const Icon = item.icon;
              const isEven = idx % 2 === 0;
              
              return (
                <div key={idx} className={`relative flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-12 mb-16 last:mb-0 scroll-reveal ${!isEven ? 'md:flex-row-reverse' : ''}`} style={{ animationDelay: `${idx * 150}ms` }}>
                  
                  {/* Content Side */}
                  <div className={`flex-1 pl-8 md:pl-0 w-full ${isEven ? 'md:text-right' : 'md:text-left'}`}>
                    <div className={`inline-flex flex-col ${isEven ? 'md:items-end' : 'md:items-start'}`}>
                      <h3 className="text-2xl font-bold mb-3 text-foreground">{item.title}</h3>
                      <p className="text-muted leading-relaxed max-w-sm">{item.desc}</p>
                    </div>
                  </div>

                  {/* Center Node */}
                  <div className="absolute left-0 md:static flex justify-center shrink-0 -translate-x-[50%] md:translate-x-0 z-10 top-0">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-accent-light flex items-center justify-center border-4 border-background shadow-sm text-primary">
                      <Icon className="w-6 h-6 md:w-7 md:h-7" />
                    </div>
                  </div>

                  {/* Empty Spacer Side */}
                  <div className="hidden md:block flex-1" />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. WHY US (NEW) */}
      <section className="py-24 bg-primary text-surface px-6 relative overflow-hidden">
        {/* Subtle decorative background for visual separation without being too loud */}
        <div className="absolute inset-0 bg-black/5 -z-10" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px] -z-10" />
        
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16 scroll-reveal">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Built differently, on purpose.</h2>
            <p className="text-lg md:text-xl text-accent-light/90 max-w-2xl mx-auto leading-relaxed">
              Most matchmaking apps ask you to pay before you can see anything real, then design every feature to keep you scrolling. {APP_NAME} works the other way.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-surface text-foreground p-8 rounded-2xl border border-border shadow-xl scroll-reveal" style={{ animationDelay: '100ms' }}>
              <div className="w-12 h-12 bg-accent-light rounded-full flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Free, genuinely.</h3>
              <p className="text-muted leading-relaxed">No subscription, no paywall, no "upgrade to see more." This exists to solve a real problem in our community, not to generate revenue.</p>
            </div>
            
            <div className="bg-surface text-foreground p-8 rounded-2xl border border-border shadow-xl scroll-reveal" style={{ animationDelay: '200ms' }}>
              <div className="w-12 h-12 bg-accent-light rounded-full flex items-center justify-center mb-6">
                <EyeOff className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Substance before appearance.</h3>
              <p className="text-muted leading-relaxed">You'll always read who someone is — their values, their story — before you ever see a photo. Not blur for blur's sake; a deliberate order.</p>
            </div>
            
            <div className="bg-surface text-foreground p-8 rounded-2xl border border-border shadow-xl scroll-reveal" style={{ animationDelay: '300ms' }}>
              <div className="w-12 h-12 bg-accent-light rounded-full flex items-center justify-center mb-6">
                <MessageCircleOff className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">No chat, no scrolling trap.</h3>
              <p className="text-muted leading-relaxed">We don't build in-app messaging designed to keep you here. Once you match, you connect through platforms you already use — then step away from the app and into an actual conversation.</p>
            </div>

            <div className="bg-surface text-foreground p-8 rounded-2xl border border-border shadow-xl scroll-reveal" style={{ animationDelay: '400ms' }}>
              <div className="w-12 h-12 bg-accent-light rounded-full flex items-center justify-center mb-6">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Privacy that's actually structural.</h3>
              <p className="text-muted leading-relaxed">Screenshots are blocked. Photos are limited-view until you've earned trust. Your identity stays private until both sides are genuinely interested.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. TESTIMONIALS */}
      <section className="py-24 bg-surface px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16 scroll-reveal">
            <h2 className="text-3xl font-bold mb-4">Stories from our community</h2>
            <p className="text-muted">Real connections made through {APP_NAME}.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* TODO: Replace with real testimonials before launch. These are placeholders. */}
            <div className="bg-background p-8 rounded-2xl border border-border scroll-reveal">
              <div className="flex gap-1 text-accent mb-4">
                ★★★★★
              </div>
              <p className="text-lg italic text-foreground mb-6">
                "I appreciated how dignified the whole process felt. The alias feature meant I didn't have to worry about my privacy while browsing."
              </p>
              <div>
                <p className="font-semibold">Fatema S.</p>
                <p className="text-sm text-muted">Matched in 2024</p>
              </div>
            </div>
            
            <div className="bg-background p-8 rounded-2xl border border-border scroll-reveal" style={{ animationDelay: '100ms' }}>
              <div className="flex gap-1 text-accent mb-4">
                ★★★★★
              </div>
              <p className="text-lg italic text-foreground mb-6">
                "Knowing that every single person on the app was ITS verified gave my family immense peace of mind."
              </p>
              <div>
                <p className="font-semibold">Hussain M.</p>
                <p className="text-sm text-muted">Matched in 2025</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

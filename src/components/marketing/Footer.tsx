import React from 'react';
import Link from 'next/link';
import { InstagramIcon } from './InstagramIcon';
import { INDEPENDENCE_SHORT } from '@/lib/seo';
import { hasPublishedPosts } from '@/lib/blog';

const APP_NAME = process.env.APP_DISPLAY_NAME ?? 'Bohra Taaruf';

type FooterLink = { label: string; href: string };

const linkCls = 'text-sm text-muted hover:text-primary transition-colors';

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <h3 className="font-semibold text-foreground mb-4">{title}</h3>
      <ul className="space-y-3">
        {links.map((l) => (
          <li key={l.href}><Link href={l.href} className={linkCls}>{l.label}</Link></li>
        ))}
      </ul>
    </div>
  );
}

export async function Footer() {
  // The Blog link shows as soon as one post is published (publishing clears the cached pages).
  const showBlog = await hasPublishedPosts();

  // Grouped by what a visitor is looking for. To add a page, add a line to the right group.
  const product: FooterLink[] = [
    { label: 'How it works', href: '/how-it-works' },
    { label: 'Features', href: '/#features' },
    { label: 'Smart Taaruf Card', href: '/smart-taaruf-card' },
    { label: 'Sign up', href: '/signup' },
  ];
  const learn: FooterLink[] = [
    { label: 'FAQ', href: '/faq' },
    { label: 'Glossary', href: '/glossary' },
    ...(showBlog ? [{ label: 'Blog', href: '/blog' }] : []),
  ];
  const company: FooterLink[] = [
    { label: 'About Us', href: '/about' },
    { label: 'Taaruf Programs', href: '/events' },
    { label: 'Contact Us', href: '/contact' },
  ];
  const legal: FooterLink[] = [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ];

  return (
    <footer className="bg-background border-t border-border py-12 mt-auto">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-10 mb-10">
          <div className="col-span-2 sm:col-span-4 lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
              <img src="/logo-light.svg" alt="" className="w-6 h-auto" />
              <span className="font-semibold text-xl tracking-tight text-primary">{APP_NAME}</span>
            </Link>
            <p className="text-muted text-sm max-w-sm leading-relaxed">
              A trusted, verified, and private space for the Dawoodi Bohra community to find meaningful connections.
            </p>
            <a
              href="https://instagram.com/bohrataaruf"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors"
            >
              <InstagramIcon size={14} />
              @bohrataaruf
            </a>
          </div>

          <FooterColumn title="Product" links={product} />
          <FooterColumn title="Learn" links={learn} />
          <FooterColumn title="Company" links={company} />
          <FooterColumn title="Legal" links={legal} />
        </div>

        <div className="pt-8 border-t border-border space-y-3">
          <p className="text-xs leading-relaxed text-muted max-w-3xl">
            {INDEPENDENCE_SHORT}
          </p>
          <p className="text-sm text-muted">
            &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

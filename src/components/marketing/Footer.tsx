import React from 'react';
import Link from 'next/link';
import { InstagramIcon } from './InstagramIcon';

const APP_NAME = process.env.APP_DISPLAY_NAME ?? 'Bohra Taaruf';

export function Footer() {
  return (
    <footer className="bg-background border-t border-border py-12 mt-auto">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <Link href="/" className="inline-block mb-4">
              <span className="font-semibold text-xl tracking-tight text-primary">{APP_NAME}</span>
            </Link>
            <p className="text-muted text-sm max-w-sm leading-relaxed">
              A trusted, verified, and private space for the Dawoodi Bohra community to find meaningful connections.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-foreground mb-4">Platform</h3>
            <ul className="space-y-3">
              <li><Link href="/#how-it-works" className="text-sm text-muted hover:text-primary transition-colors">How it works</Link></li>
              <li><Link href="/#features" className="text-sm text-muted hover:text-primary transition-colors">Features</Link></li>
              <li><Link href="/about" className="text-sm text-muted hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/signup" className="text-sm text-muted hover:text-primary transition-colors">Sign up</Link></li>
              <li>
                <a
                  href="https://instagram.com/bohrataaruf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors"
                >
                  <InstagramIcon size={14} />
                  @bohrataaruf
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-foreground mb-4">Legal</h3>
            <ul className="space-y-3">
              <li><Link href="/privacy" className="text-sm text-muted hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-muted hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="/contact" className="text-sm text-muted hover:text-primary transition-colors">Contact Us</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted">
            &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
          <p className="text-xs text-muted/70">
            An independent initiative for the Dawoodi Bohra community. Not affiliated with any institution.
          </p>
        </div>
      </div>
    </footer>
  );
}

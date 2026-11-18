import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

// The contact page is a client component, so its metadata lives in this layout.
// Without it the page inherited the homepage's title and description.
export const metadata = pageMetadata({
  title: 'Contact Us',
  description: 'Questions about Bohra Taaruf, your account, or your biodata? Write to the Bohra Taaruf team and we will help.',
  path: '/contact',
});

export default function ContactLayout({ children }: { children: ReactNode }) {
  return children;
}

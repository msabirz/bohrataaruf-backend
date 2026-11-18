import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

// The signup page is a client component, so its metadata lives in this layout.
// Without it the page inherited the homepage's title and description.
export const metadata = pageMetadata({
  title: 'Sign Up',
  description: 'Create your free Bohra Taaruf account with your ITS number. A verified, private space for the Dawoodi Bohra community.',
  path: '/signup',
});

export default function SignupLayout({ children }: { children: ReactNode }) {
  return children;
}

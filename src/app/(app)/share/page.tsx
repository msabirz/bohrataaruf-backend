import type { Metadata } from 'next';
import { SharePageClient } from '@/components/share/account/SharePageClient';

export const metadata: Metadata = { title: 'Share my profile' };

export default function SharePage() {
  return <SharePageClient />;
}

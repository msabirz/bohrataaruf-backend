import Link from 'next/link';
import { breadcrumbJsonLd, faqJsonLd, pageMetadata, INDEPENDENCE_SHORT } from '@/lib/seo';
import { ContentPage } from '@/components/marketing/ContentPage';

export const metadata = pageMetadata({
  title: 'Frequently Asked Questions',
  description: 'Is Bohra Taaruf free? Does it arrange marriages? Who can see my photo and name? Answers about verification, privacy and the Smart Taaruf Card.',
  path: '/faq',
});

const FAQS: { q: string; a: string }[] = [
  { q: 'What is Bohra Taaruf?', a: 'A free, private platform for Dawoodi Bohra individuals and families who are looking for a partner. You can view private profiles and show interest, and you can share your own biodata with the Smart Taaruf Card.' },
  { q: 'Is Bohra Taaruf a matrimonial site? Do you arrange marriages?', a: 'No. We suggest profiles and give you a private way to share your biodata. We do not arrange marriages or act as a go-between. Families talk, decide and take things forward themselves.' },
  { q: 'Is it really free?', a: 'Yes. Every feature is free for every family, and there are no paid tiers.' },
  { q: 'Who can join?', a: 'Adult members of the Dawoodi Bohra community with a valid ITS number.' },
  { q: 'How are profiles verified?', a: 'Each member uploads a selfie with their ITS card, and a volunteer from our team reviews it by hand. A verified badge appears once it is approved.' },
  { q: 'Do you store my ITS number?', a: 'No. We keep only a scrambled (hashed) version, which cannot be turned back into the number.' },
  { q: 'Who can see my name and photo?', a: 'While you are browsing, members appear under an alias and photos are blurred on our servers. Names and clear photos become visible to each other only when both sides show interest.' },
  { q: 'Is this a social or dating app?', a: 'No. There is no feed to scroll and no following. You view profiles and show interest.' },
  { q: 'What is the Smart Taaruf Card?', a: 'Your biodata as one private link instead of a PDF forwarded in many chats. You choose which details show, keep your photo blurred unless you decide otherwise, see how many times each link was opened, and can switch it off whenever you like.' },
  { q: 'Is Bohra Taaruf an official website?', a: INDEPENDENCE_SHORT },
];

export default function FaqPage() {
  return (
    <ContentPage
      title="Frequently asked questions"
      intro="Short answers about how Bohra Taaruf works and what stays private."
      jsonLd={[breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'FAQ', path: '/faq' }]), faqJsonLd(FAQS)]}
    >
      <div className="space-y-8">
        {FAQS.map((f) => (
          <div key={f.q}>
            <h2 className="text-xl font-semibold text-foreground">{f.q}</h2>
            <p className="mt-2 leading-relaxed text-muted">{f.a}</p>
          </div>
        ))}
      </div>
      <p className="mt-10 text-muted">
        Something else? <Link href="/contact" className="text-primary underline underline-offset-2">Contact us</Link>.
      </p>
    </ContentPage>
  );
}

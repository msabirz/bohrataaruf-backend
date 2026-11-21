import { pageMetadata, SITE_URL } from '@/lib/seo';
import { ContentPage } from '@/components/marketing/ContentPage';

export const metadata = pageMetadata({
  title: 'Taaruf, Nisbat, Nikah and Other Terms Explained',
  description: 'Plain meanings of taaruf, nisbat, nikah, rishta, biodata and ITS number, in the order a family meets them, and where Bohra Taaruf and the Smart Taaruf Card fit.',
  path: '/glossary',
});

// Plain, practical meanings only: what the word refers to in a family's search.
// No religious guidance. Reviewed by the site owner before publishing.
const TERMS: { term: string; meaning: string }[] = [
  { term: 'Taaruf', meaning: 'An Arabic word meaning getting to know one another. In the community it describes the first introductions between families, and the community events where families meet. Bohra Taaruf is named after it.' },
  { term: 'Biodata', meaning: 'A short document of a person\'s details (education, work, family, city and so on) that families share when a proposal is being considered. The Smart Taaruf Card is a private, controlled way to share one.' },
  { term: 'Rishta', meaning: 'A word from Urdu and Hindi for a proposal, or a possible match between two people and their families.' },
  { term: 'Nisbat', meaning: 'The stage after two families agree to go ahead with a proposal. It is commonly described as the engagement.' },
  { term: 'Nikah', meaning: 'The marriage ceremony, and the final step once families have decided. Bohra Taaruf has no part in it.' },
  { term: 'ITS number', meaning: 'The member ID number issued within the community. Bohra Taaruf asks for it, with a photo of the ITS card, so that our own team can check that each member is genuine. We are not connected to ITS, and we store only a scrambled (hashed) version of the number.' },
  { term: 'Alias', meaning: 'The display name other members see while browsing. Real names are revealed only when both sides show interest.' },
  { term: 'Mutual interest', meaning: 'When two members have each shown interest in the other. This is the point where names and photos become visible to each other.' },
  { term: 'Smart Taaruf Card', meaning: 'Your biodata as a private link you control: you choose what shows, keep your photo blurred, see how many times it was opened, and switch it off whenever you like.' },
];

export default function GlossaryPage() {
  const glossaryLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'Bohra Taaruf glossary',
    url: `${SITE_URL}/glossary`,
    hasDefinedTerm: TERMS.map((t) => ({ '@type': 'DefinedTerm', name: t.term, description: t.meaning })),
  };
  return (
    <ContentPage
      title="Taaruf, nisbat, nikah and other terms explained"
      intro="The words families come across when a proposal is being considered, in plain language. Bohra Taaruf helps with the first step only: seeing profiles and sharing a biodata privately. Everything after that is for families."
      breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Glossary', path: '/glossary' }]}
      jsonLd={[glossaryLd]}
    >
      <dl className="space-y-6">
        {TERMS.map((t) => (
          <div key={t.term} className="border-b border-border pb-6">
            <dt className="text-xl font-semibold text-foreground">{t.term}</dt>
            <dd className="mt-1 leading-relaxed text-muted">{t.meaning}</dd>
          </div>
        ))}
      </dl>
    </ContentPage>
  );
}

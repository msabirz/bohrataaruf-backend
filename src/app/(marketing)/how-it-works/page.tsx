import { pageMetadata } from '@/lib/seo';
import { getSiteMode } from '@/lib/modeGuard';
import { ContentPage } from '@/components/marketing/ContentPage';

export const revalidate = 60;

export const metadata = pageMetadata({
  title: 'How Bohra Taaruf Works',
  description: 'Create a verified profile, see private profiles with blurred photos, show interest, and share your biodata with the Smart Taaruf Card. How each step works, and what stays private.',
  path: '/how-it-works',
});

const STEPS = [
  { title: 'Create your account', body: 'Sign up with your name, email, password and ITS number. We keep only a scrambled (hashed) version of the ITS number, never the number itself.' },
  { title: 'Get verified by our team', body: 'Upload a selfie with your ITS card. A volunteer reviews it by hand, and a verified badge appears once it is approved. Verification is done by people, not by software.' },
  { title: 'Complete your profile', body: 'Add your education, profession, city, family background and what you are looking for in a partner. The more complete it is, the better the suggestions.' },
  { title: 'See private profiles', body: 'Other members appear under an alias, and their photos are blurred on our servers. Real names and clear photos stay hidden while you browse.' },
  { title: 'Show interest', body: 'Show interest in the profiles you like. Only when both sides show interest do names and photos become visible to each other.' },
  { title: 'Families take it from there', body: 'Bohra Taaruf suggests profiles. It does not arrange marriages. What happens after mutual interest is for you and your families to decide.' },
];

export default async function HowItWorksPage() {
  const preLaunch = (await getSiteMode()) === 'B';
  return (
    <ContentPage
      title="How Bohra Taaruf works"
      intro="A short walk through the steps, and what stays private at each one. Everything here is free."
      breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'How it works', path: '/how-it-works' }]}
    >
      {preLaunch && (
        <p className="mb-8 rounded-xl border border-[#E5E0D8] bg-[#F8F5F0] p-4 text-sm leading-relaxed text-muted">
          Browsing profiles opens once enough verified families have joined. You can create and complete your profile now, and we will email you the moment browsing opens.
        </p>
      )}
      <ol className="space-y-6">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#8C6A3F] text-sm font-bold text-white">{i + 1}</span>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{s.title}</h2>
              <p className="mt-1 leading-relaxed text-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="mt-14 text-2xl font-bold text-foreground">Sharing your biodata</h2>
      <p className="mt-3 leading-relaxed text-muted">
        Separate from browsing, you can make a Smart Taaruf Card at any time: one private link to your biodata, instead of a PDF forwarded in many chats. You choose which details show, your photo stays blurred unless you decide otherwise, you can see how many times a link was opened, and you can switch it off whenever you like.
      </p>
    </ContentPage>
  );
}

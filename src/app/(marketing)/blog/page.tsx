import Link from 'next/link';
import type { Metadata } from 'next';
import { SITE_URL, pageMetadata } from '@/lib/seo';
import { listPublishedPosts } from '@/lib/blog';
import { ContentPage } from '@/components/marketing/ContentPage';
import { formatDate } from '@/lib/formatDate';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const base = pageMetadata({
    title: 'Blog',
    description: 'Guides and notes from Bohra Taaruf on sharing your biodata safely and on how families meet.',
    path: '/blog',
  });
  // Until there is a post, the page is thin: keep it out of search results.
  const posts = await listPublishedPosts();
  return posts.length ? base : { ...base, robots: { index: false, follow: true } };
}

export default async function BlogIndexPage() {
  const posts = await listPublishedPosts();
  const blogLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Bohra Taaruf Blog',
    url: `${SITE_URL}/blog`,
    inLanguage: 'en',
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: `${SITE_URL}/blog/${p.slug}`,
      datePublished: p.publishedAt?.toISOString(),
    })),
  };
  return (
    <ContentPage
      title="Blog"
      intro="Guides and notes from the Bohra Taaruf team."
      breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }]}
      jsonLd={posts.length ? [blogLd] : []}
    >
      {posts.length === 0 ? (
        <p className="text-muted">The first posts are coming soon.</p>
      ) : (
        <ul className="space-y-8">
          {posts.map((p) => (
            <li key={p.id} className="border-b border-border pb-8">
              <h2 className="text-2xl font-bold text-foreground">
                <Link href={`/blog/${p.slug}`} className="hover:text-primary">{p.title}</Link>
              </h2>
              <p className="mt-1 text-sm text-muted">
                {p.authorName}
                {p.publishedAt && <> &middot; {formatDate(p.publishedAt)}</>}
              </p>
              {p.excerpt && <p className="mt-3 leading-relaxed text-muted">{p.excerpt}</p>}
              <Link href={`/blog/${p.slug}`} className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">Read more &rarr;</Link>
            </li>
          ))}
        </ul>
      )}
    </ContentPage>
  );
}

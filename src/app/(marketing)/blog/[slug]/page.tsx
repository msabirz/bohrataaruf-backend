import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { DEFAULT_SHARE_IMAGE, SITE_URL, pageMetadata } from '@/lib/seo';
import { getPublishedPost, readingMinutes } from '@/lib/blog';
import { firstImageSrc, parseStoredBody } from '@/lib/blogDoc';
import { BlogContent } from '@/components/BlogContent';
import { ContentPage } from '@/components/marketing/ContentPage';
import { formatDate } from '@/lib/formatDate';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: 'Post not found', robots: { index: false } };
  const meta = pageMetadata({
    title: post.title,
    description: post.excerpt || `${post.title}, by ${post.authorName}.`,
    path: `/blog/${post.slug}`,
  });
  return {
    ...meta,
    authors: [{ name: post.authorName }],
    openGraph: { ...meta.openGraph, type: 'article', publishedTime: post.publishedAt?.toISOString(), modifiedTime: post.updatedAt.toISOString(), authors: [post.authorName] },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  const firstImage = firstImageSrc(parseStoredBody(post.body));
  // A name such as "The Bohra Taaruf team" is an organisation, not a person.
  const authorType = /\b(team|taaruf)\b/i.test(post.authorName) ? 'Organization' : 'Person';
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || undefined,
    image: [firstImage ? `${SITE_URL}${firstImage}` : DEFAULT_SHARE_IMAGE.url],
    inLanguage: 'en',
    author: { '@type': authorType, name: post.authorName },
    publisher: { '@type': 'Organization', name: 'Bohra Taaruf', logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo-light.svg` } },
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };

  return (
    <ContentPage
      title={post.title}
      breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: post.title, path: `/blog/${post.slug}` }]}
      jsonLd={[articleLd]}
    >
      <p className="-mt-2 mb-8 text-sm text-muted">
        By {post.authorName}
        {post.publishedAt && <> &middot; {formatDate(post.publishedAt)}</>}
        {' '}&middot; {readingMinutes(post.body)} min read
      </p>
      <article className="text-base">
        <BlogContent body={post.body} />
      </article>
    </ContentPage>
  );
}

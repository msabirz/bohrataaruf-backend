import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { requireAdminAuth } from '@/lib/adminAuth';
import { db } from '@/lib/db';
import { blogPosts } from '@/lib/db/schema';
import BlogEditor from '../BlogEditor';

export const dynamic = 'force-dynamic';

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminAuth();
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  if (!post) notFound();
  return (
    <BlogEditor
      post={{ id: post.id, title: post.title, slug: post.slug, excerpt: post.excerpt, body: post.body, authorName: post.authorName, status: post.status as 'draft' | 'published' }}
    />
  );
}

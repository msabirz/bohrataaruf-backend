import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { blogPosts } from '@/lib/db/schema';
import { getAdminSession } from '@/lib/adminAuth';
import { slugify, PostBody } from '@/lib/blog';


export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const posts = await db
    .select({ id: blogPosts.id, slug: blogPosts.slug, title: blogPosts.title, authorName: blogPosts.authorName, status: blogPosts.status, publishedAt: blogPosts.publishedAt, updatedAt: blogPosts.updatedAt })
    .from(blogPosts)
    .orderBy(desc(blogPosts.updatedAt));
  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = PostBody.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid post' }, { status: 400 });
    const d = parsed.data;

    const slug = slugify(d.slug || d.title);
    if (!slug) return NextResponse.json({ error: 'The web address needs some letters or numbers' }, { status: 400 });

    const taken = await db.select({ id: blogPosts.id }).from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
    if (taken.length) return NextResponse.json({ error: 'Another post already uses this web address. Change it.' }, { status: 409 });

    const [post] = await db
      .insert(blogPosts)
      .values({
        slug, title: d.title, excerpt: d.excerpt, body: d.body, authorName: d.authorName, status: d.status,
        publishedAt: d.status === 'published' ? new Date() : null,
        updatedBy: session.volunteerId,
      })
      .returning();

    revalidatePath('/blog');
    revalidatePath('/', 'layout'); // the footer's Blog link depends on whether any post is public
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('[Admin blog POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

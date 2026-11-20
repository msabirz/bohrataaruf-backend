import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import { blogPosts } from '@/lib/db/schema';
import { getAdminSession } from '@/lib/adminAuth';
import { slugify, PostBody } from '@/lib/blog';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ post });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    if (!UUID.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const parsed = PostBody.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid post' }, { status: 400 });
    const d = parsed.data;

    const [existing] = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const slug = slugify(d.slug || d.title);
    if (!slug) return NextResponse.json({ error: 'The web address needs some letters or numbers' }, { status: 400 });
    const taken = await db.select({ id: blogPosts.id }).from(blogPosts).where(and(eq(blogPosts.slug, slug), ne(blogPosts.id, id))).limit(1);
    if (taken.length) return NextResponse.json({ error: 'Another post already uses this web address. Change it.' }, { status: 409 });

    // The publish date is set the first time a post goes live and then kept.
    const publishedAt = d.status === 'published' ? existing.publishedAt ?? new Date() : existing.publishedAt;

    const [post] = await db
      .update(blogPosts)
      .set({ slug, title: d.title, excerpt: d.excerpt, body: d.body, authorName: d.authorName, status: d.status, publishedAt, updatedAt: new Date(), updatedBy: session.volunteerId })
      .where(eq(blogPosts.id, id))
      .returning();

    revalidatePath('/blog');
    revalidatePath('/', 'layout'); // the footer's Blog link depends on whether any post is public
    revalidatePath(`/blog/${existing.slug}`);
    revalidatePath(`/blog/${slug}`);
    return NextResponse.json({ post });
  } catch (error) {
    console.error('[Admin blog PUT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    if (!UUID.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const [gone] = await db.delete(blogPosts).where(eq(blogPosts.id, id)).returning({ slug: blogPosts.slug });
    if (!gone) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    revalidatePath('/blog');
    revalidatePath('/', 'layout'); // the footer's Blog link depends on whether any post is public
    revalidatePath(`/blog/${gone.slug}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Admin blog DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

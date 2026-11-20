import Link from 'next/link';
import { desc } from 'drizzle-orm';
import { requireAdminAuth } from '@/lib/adminAuth';
import { db } from '@/lib/db';
import { blogPosts } from '@/lib/db/schema';
import { formatDate } from '@/lib/formatDate';

export const dynamic = 'force-dynamic';

export default async function AdminBlogPage() {
  await requireAdminAuth();
  const posts = await db
    .select({ id: blogPosts.id, slug: blogPosts.slug, title: blogPosts.title, authorName: blogPosts.authorName, status: blogPosts.status, publishedAt: blogPosts.publishedAt, updatedAt: blogPosts.updatedAt })
    .from(blogPosts)
    .orderBy(desc(blogPosts.updatedAt));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Blog</h2>
          <p className="text-gray-500 text-sm mt-1">Posts appear on /blog once published. Drafts are visible only here.</p>
        </div>
        <Link href="/admin/blog/new" className="rounded-lg bg-[#8C6A3F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7a5b35]">New post</Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {posts.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">No posts yet. Write the first one.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Author</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Updated</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {posts.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/blog/${p.id}`} className="font-medium text-gray-900 hover:text-[#8C6A3F]">{p.title}</Link>
                    <div className="text-xs text-gray-400">/blog/{p.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.authorName}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {p.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

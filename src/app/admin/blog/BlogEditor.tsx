'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Markdown } from '@/components/Markdown';

interface EditablePost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  authorName: string;
  status: 'draft' | 'published';
}

const slugify = (t: string) => t.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);

const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#8C6A3F] focus:outline-none';

export default function BlogEditor({ post }: { post: EditablePost | null }) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!post);
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [authorName, setAuthorName] = useState(post?.authorName ?? '');
  const [body, setBody] = useState(post?.body ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState(false);

  const save = async (status: 'draft' | 'published') => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch(post ? `/api/admin/blog/${post.id}` : '/api/admin/blog', {
        method: post ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, slug: slug || undefined, excerpt, body, authorName, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'Could not save the post'); return; }
      if (!post) { router.push(`/admin/blog/${data.post.id}`); return; }
      setSlug(data.post.slug);
      setNotice(status === 'published' ? 'Published. It is live on /blog.' : 'Saved as a draft.');
      router.refresh();
    } catch {
      setError('Could not reach the server');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!post) return;
    if (!window.confirm('Delete this post for good? This cannot be undone.')) return;
    setSaving(true);
    const res = await fetch(`/api/admin/blog/${post.id}`, { method: 'DELETE' });
    if (res.ok) router.push('/admin/blog');
    else { setError('Could not delete the post'); setSaving(false); }
  };

  const isPublished = post?.status === 'published';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/blog" className="text-sm text-gray-500 hover:text-[#8C6A3F]">&larr; All posts</Link>
          <h2 className="mt-1 text-2xl font-bold text-gray-900">{post ? 'Edit post' : 'New post'}</h2>
        </div>
        {isPublished && post && (
          <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[#8C6A3F] hover:underline">View live &rarr;</a>
        )}
      </div>

      <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
          <input className={inputCls} value={title} maxLength={160} onChange={(e) => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Author name</label>
            <input className={inputCls} value={authorName} maxLength={80} placeholder="Shown under the title" onChange={(e) => setAuthorName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Web address</label>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <span>/blog/</span>
              <input className={inputCls} value={slug} maxLength={80} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }} />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Short summary <span className="font-normal text-gray-400">(shown in the list and in search results, up to 300 characters)</span></label>
          <textarea className={inputCls} rows={2} value={excerpt} maxLength={300} onChange={(e) => setExcerpt(e.target.value)} />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Post <span className="font-normal text-gray-400">(Markdown)</span></label>
            <div className="flex overflow-hidden rounded-lg border border-gray-300 text-xs font-medium">
              <button type="button" onClick={() => setPreview(false)} className={`px-3 py-1 ${!preview ? 'bg-[#8C6A3F] text-white' : 'bg-white text-gray-600'}`}>Write</button>
              <button type="button" onClick={() => setPreview(true)} className={`px-3 py-1 ${preview ? 'bg-[#8C6A3F] text-white' : 'bg-white text-gray-600'}`}>Preview</button>
            </div>
          </div>
          {preview ? (
            <div className="min-h-[360px] rounded-lg border border-gray-200 bg-[#FAF6EF] p-5 text-base">
              {body.trim() ? <Markdown source={body} /> : <p className="text-sm text-gray-400">Nothing to preview yet.</p>}
            </div>
          ) : (
            <textarea className={`${inputCls} font-mono`} rows={18} value={body} onChange={(e) => setBody(e.target.value)} placeholder={'## A heading\n\nA paragraph with **bold**, *italic* and a [link](/smart-taaruf-card).\n\n- A list item\n- Another one'} />
          )}
          <p className="mt-1 text-xs text-gray-400">Headings: ## and ###. Lists: start lines with - or 1. Quotes: start with &gt;. Links: [text](address).</p>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {notice && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</p>}

        <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-5">
          <button disabled={saving} onClick={() => save('published')} className="rounded-lg bg-[#8C6A3F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#7a5b35] disabled:opacity-60">
            {isPublished ? 'Save and keep published' : 'Publish'}
          </button>
          <button disabled={saving} onClick={() => save('draft')} className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            {isPublished ? 'Unpublish (back to draft)' : 'Save draft'}
          </button>
          {post && (
            <button disabled={saving} onClick={remove} className="ml-auto text-sm font-medium text-red-600 hover:underline disabled:opacity-60">Delete post</button>
          )}
        </div>
      </div>
    </div>
  );
}

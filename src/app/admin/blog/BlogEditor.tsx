'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, useEditorState, type NodeViewProps } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { parseStoredBody } from '@/lib/blogDoc';
import { ALIGN_CLASS, ALIGN_LABEL, DEFAULT_IMAGE_ALIGN, DEFAULT_IMAGE_SIZE, IMAGE_ALIGNS, IMAGE_SIZES, SIZE_CLASS, SIZE_LABEL } from '@/lib/blogImageStyle';

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

/** A picture in the editor: size and alignment buttons above it, the caption under it, laid out as on the page. */
function ImageWithCaption({ node, updateAttributes, selected }: NodeViewProps) {
  const size = node.attrs.size || DEFAULT_IMAGE_SIZE;
  const align = node.attrs.align || DEFAULT_IMAGE_ALIGN;
  const btn = (on: boolean) => `rounded px-2 py-0.5 text-xs font-medium ${on ? 'bg-[#8C6A3F] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`;
  return (
    <NodeViewWrapper className="my-5" contentEditable={false}>
      <div className="mb-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
        <div className="flex items-center gap-1" role="group" aria-label="Picture size">
          <span className="mr-1 text-xs text-gray-400">Size</span>
          {IMAGE_SIZES.map((s) => (
            <button key={s} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => updateAttributes({ size: s })} className={btn(size === s)}>{SIZE_LABEL[s]}</button>
          ))}
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Picture alignment">
          <span className="mr-1 text-xs text-gray-400">Align</span>
          {IMAGE_ALIGNS.map((a) => (
            <button key={a} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => updateAttributes({ align: a })} className={btn(align === a)}>{ALIGN_LABEL[a]}</button>
          ))}
        </div>
      </div>
      <figure className={`${SIZE_CLASS[size as keyof typeof SIZE_CLASS]} ${ALIGN_CLASS[align as keyof typeof ALIGN_CLASS]}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={node.attrs.src} alt={node.attrs.alt || ''} className={`h-auto w-full rounded-xl border ${selected ? 'border-[#C9A24B] ring-2 ring-[#C9A24B]' : 'border-gray-200'}`} draggable={false} />
        <input
          type="text"
          value={node.attrs.caption || ''}
          maxLength={300}
          placeholder="Add a caption (optional)"
          onChange={(e) => updateAttributes({ caption: e.target.value })}
          className="mt-2 w-full border-0 border-b border-dashed border-gray-300 bg-transparent px-1 py-1 text-center text-sm italic text-gray-600 focus:border-[#8C6A3F] focus:outline-none"
        />
      </figure>
    </NodeViewWrapper>
  );
}

/** Pages people link to most. One click applies the link to the selected words. */
const QUICK_LINKS = [
  { label: 'Smart Taaruf Card', href: '/smart-taaruf-card' },
  { label: 'FAQ', href: '/faq' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Glossary', href: '/glossary' },
  { label: 'Events', href: '/events' },
];

/**
 * Shown while the cursor is inside a link (or after pressing Link / Cmd+K). Edit the address,
 * open it, or remove it, without selecting and re-adding the link. Remounted (via key) whenever
 * the cursor moves to a different link, so the address box always shows the link under the cursor.
 */
function LinkBar({ editor, href, autoFocus, onClose }: { editor: Editor; href: string | null; autoFocus: boolean; onClose: () => void }) {
  const [draft, setDraft] = useState(href ?? '');
  const apply = (value: string) => {
    const url = value.trim();
    if (!url) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    onClose();
  };
  const hasWords = !editor.state.selection.empty || !!href;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-amber-50 px-3 py-2 text-sm">
      <span className="font-medium text-gray-700">{href ? 'Edit link' : 'Add link'}</span>
      <input
        type="text"
        value={draft}
        autoFocus={autoFocus}
        placeholder={hasWords ? 'https://… or /faq' : 'Select some words first'}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply(draft); } if (e.key === 'Escape') onClose(); }}
        className="min-w-[200px] flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:border-[#8C6A3F] focus:outline-none"
      />
      <button type="button" disabled={!hasWords || !draft.trim()} onClick={() => apply(draft)} className="rounded bg-[#8C6A3F] px-3 py-1 text-xs font-semibold text-white hover:bg-[#7a5b35] disabled:opacity-50">
        {href ? 'Update' : 'Add'}
      </button>
      {href && (
        <>
          <a href={href} target="_blank" rel="noopener noreferrer" className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50">Open</a>
          <button type="button" onClick={() => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); onClose(); }} className="rounded border border-red-200 bg-white px-2.5 py-1 text-xs text-red-700 hover:bg-red-50">Remove link</button>
        </>
      )}
      <div className="flex w-full flex-wrap items-center gap-1.5 pt-1">
        <span className="text-xs text-gray-500">Quick:</span>
        {QUICK_LINKS.map((q) => (
          <button key={q.href} type="button" disabled={!hasWords} onClick={() => apply(q.href)} className="rounded-full border border-gray-300 bg-white px-2.5 py-0.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50">{q.label}</button>
        ))}
        <button type="button" onClick={onClose} className="ml-auto text-xs text-gray-500 hover:text-gray-800">Close</button>
      </div>
    </div>
  );
}

const ImageWithCaptionExtension = Image.extend({
  addAttributes() {
    return { ...this.parent?.(), caption: { default: '' }, size: { default: DEFAULT_IMAGE_SIZE }, align: { default: DEFAULT_IMAGE_ALIGN } };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageWithCaption);
  },
});

const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#8C6A3F] focus:outline-none';

export default function BlogEditor({ post }: { post: EditablePost | null }) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!post);
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [authorName, setAuthorName] = useState(post?.authorName ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploading, setUploading] = useState(false);
  const [linkBarOpen, setLinkBarOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);

  // Uploads a picture (pasted, dropped or chosen) and puts it in the post where the cursor is.
  const addImage = useCallback(async (file: File) => {
    setError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/blog/upload', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'Could not upload the picture'); return; }
      editorRef.current?.chain().focus().setImage({ src: data.url, alt: '', caption: '', size: DEFAULT_IMAGE_SIZE, align: DEFAULT_IMAGE_ALIGN } as never).run();
    } catch {
      setError('Could not reach the server to upload the picture');
    } finally {
      setUploading(false);
    }
  }, []);

  const openPicker = useCallback(() => fileInput.current?.click(), []);

  const editor = useEditor({
    immediatelyRender: false, // the page is rendered on the server first
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // Kept to what the public page can show.
        code: false, codeBlock: false, strike: false, underline: false,
        link: { openOnClick: false, autolink: false },
      }),
      ImageWithCaptionExtension.configure({ inline: false, allowBase64: false }),
    ],
    content: parseStoredBody(post?.body ?? ''),
    editorProps: {
      attributes: { class: 'blog-editor-content min-h-[360px] px-4 py-3 focus:outline-none' },
      // A screenshot copied on a Mac (Cmd+Shift+Ctrl+4) or any copied picture: paste it straight in.
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault();
          setLinkBarOpen(true);
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        // Words selected + a page on this site copied (such as /faq): turn the words into a link.
        // The editor only does this by itself for full web addresses.
        const pasted = event.clipboardData?.getData('text/plain')?.trim() ?? '';
        if (!view.state.selection.empty && /^\/(?!\/)[A-Za-z0-9\-_/#?=&.%]*$/.test(pasted)) {
          event.preventDefault();
          editorRef.current?.chain().focus().extendMarkRange('link').setLink({ href: pasted }).run();
          return true;
        }
        const images = Array.from(event.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
        if (!images.length) return false;
        event.preventDefault();
        images.forEach((f) => void addImage(f));
        return true;
      },
      handleDrop: (_view, event) => {
        const images = Array.from(event.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'));
        if (!images.length) return false;
        event.preventDefault();
        images.forEach((f) => void addImage(f));
        return true;
      },
    },
  });
  useEffect(() => { editorRef.current = editor; }, [editor]);

  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: !!e?.isActive('bold'), italic: !!e?.isActive('italic'),
      h2: !!e?.isActive('heading', { level: 2 }), h3: !!e?.isActive('heading', { level: 3 }),
      bullet: !!e?.isActive('bulletList'), ordered: !!e?.isActive('orderedList'),
      quote: !!e?.isActive('blockquote'), link: !!e?.isActive('link'), image: !!e?.isActive('image'),
      linkHref: (e?.getAttributes('link').href as string | undefined) ?? null,
    }),
  });

  const save = async (status: 'draft' | 'published') => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch(post ? `/api/admin/blog/${post.id}` : '/api/admin/blog', {
        method: post ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, slug: slug || undefined, excerpt, body: editor?.getJSON(), authorName, status }),
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
          <label className="mb-1 block text-sm font-medium text-gray-700">Post <span className="font-normal text-gray-400">(paste or drop pictures straight in, including screenshots copied on a Mac)</span></label>
          <div className="overflow-hidden rounded-lg border border-gray-300 bg-white">
            <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
              {[
                { label: 'B', title: 'Bold', on: active?.bold, run: () => editor?.chain().focus().toggleBold().run(), cls: 'font-bold' },
                { label: 'I', title: 'Italic', on: active?.italic, run: () => editor?.chain().focus().toggleItalic().run(), cls: 'italic' },
                { label: 'H2', title: 'Heading', on: active?.h2, run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
                { label: 'H3', title: 'Smaller heading', on: active?.h3, run: () => editor?.chain().focus().toggleHeading({ level: 3 }).run() },
                { label: '• List', title: 'Bullet list', on: active?.bullet, run: () => editor?.chain().focus().toggleBulletList().run() },
                { label: '1. List', title: 'Numbered list', on: active?.ordered, run: () => editor?.chain().focus().toggleOrderedList().run() },
                { label: '“ Quote', title: 'Quote', on: active?.quote, run: () => editor?.chain().focus().toggleBlockquote().run() },
                { label: 'Link', title: 'Add or edit a link (Cmd+K)', on: active?.link, run: () => setLinkBarOpen(true) },
                { label: '―', title: 'Divider line', on: false, run: () => editor?.chain().focus().setHorizontalRule().run() },
                { label: '↶', title: 'Undo', on: false, run: () => editor?.chain().focus().undo().run() },
                { label: '↷', title: 'Redo', on: false, run: () => editor?.chain().focus().redo().run() },
              ].map((b) => (
                <button
                  key={b.title}
                  type="button"
                  title={b.title}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={b.run}
                  className={`rounded px-2.5 py-1 text-sm ${b.cls ?? ''} ${b.on ? 'bg-[#8C6A3F] text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                >
                  {b.label}
                </button>
              ))}
              <button
                type="button"
                title="Add a picture"
                disabled={uploading}
                onMouseDown={(e) => e.preventDefault()}
                onClick={openPicker}
                className="rounded px-2.5 py-1 text-sm text-gray-700 hover:bg-gray-200"
              >
                {uploading ? 'Uploading…' : 'Picture'}
              </button>
              {active?.image && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const alt = window.prompt('Describe the picture (read out for people who cannot see it, and used by search engines)');
                    if (alt !== null) editor?.chain().focus().updateAttributes('image', { alt: alt.slice(0, 200) }).run();
                  }}
                  className="rounded bg-amber-100 px-2.5 py-1 text-sm text-amber-900 hover:bg-amber-200"
                >
                  Picture description
                </button>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void addImage(f); e.target.value = ''; }}
              />
            </div>
            {editor && (linkBarOpen || active?.linkHref) && (
              <LinkBar key={active?.linkHref ?? 'new'} editor={editor} href={active?.linkHref ?? null} autoFocus={linkBarOpen} onClose={() => setLinkBarOpen(false)} />
            )}
            <EditorContent editor={editor} className="blog-editor" />
          </div>
          <style>{`
            .blog-editor-content > * + * { margin-top: 0.75rem; }
            .blog-editor-content h2 { font-size: 1.5rem; font-weight: 700; margin-top: 1.5rem; }
            .blog-editor-content h3 { font-size: 1.25rem; font-weight: 600; margin-top: 1.25rem; }
            .blog-editor-content ul { list-style: disc; padding-left: 1.5rem; }
            .blog-editor-content ol { list-style: decimal; padding-left: 1.5rem; }
            .blog-editor-content blockquote { border-left: 4px solid #d8c7a5; padding-left: 1rem; font-style: italic; color: #6b6558; }
            .blog-editor-content a { color: #8C6A3F; text-decoration: underline; }
            .blog-editor-content img { max-width: 100%; height: auto; border-radius: 0.75rem; }
            .blog-editor-content img.ProseMirror-selectednode { outline: 3px solid #C9A24B; }
            .blog-editor-content hr { border-color: #e5e0d8; margin: 1.5rem 0; }
          `}</style>
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

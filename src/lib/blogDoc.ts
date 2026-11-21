/**
 * The blog post format and its safety checks.
 *
 * A post is stored as a small JSON document (the editor's native format), never as HTML.
 * `cleanDoc` rebuilds whatever the browser sent using only an allowlist of node types,
 * marks and attributes, so a hand-crafted request cannot smuggle in scripts, odd links or
 * outside images. The page then renders the cleaned document as plain React elements.
 */

// Not under /api, so search engines (robots.txt blocks /api) may fetch and index the pictures.
import { DEFAULT_IMAGE_ALIGN, DEFAULT_IMAGE_SIZE, IMAGE_ALIGNS, IMAGE_SIZES, type ImageAlign, type ImageSize } from '@/lib/blogImageStyle';

export const BLOG_IMAGE_PREFIX = '/blog-images/';
const IMAGE_SRC = /^\/blog-images\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

// Same shape the editor uses, so cleaning a cleaned document changes nothing.
export type Mark = { type: 'bold' } | { type: 'italic' } | { type: 'link'; attrs: { href: string } };
export type DocNode = {
  type: string;
  text?: string;
  attrs?: { level?: number; src?: string; alt?: string; caption?: string; size?: ImageSize; align?: ImageAlign };
  marks?: Mark[];
  content?: DocNode[];
};
export type Doc = { type: 'doc'; content: DocNode[] };

export const EMPTY_DOC: Doc = { type: 'doc', content: [] };

const MAX_NODES = 5000;
const MAX_DEPTH = 8;
const MAX_TEXT = 20000;

/** Links may point to http(s), mailto, or a page on this site. Anything else is dropped. */
export function safeHref(href: unknown): string | null {
  if (typeof href !== 'string') return null;
  const h = href.trim().slice(0, 2000);
  if (/^https?:\/\//i.test(h) || /^mailto:/i.test(h)) return h;
  if (h.startsWith('/') && !h.startsWith('//')) return h;
  return null;
}

// Which child types each parent may hold.
const BLOCKS = ['paragraph', 'heading', 'bulletList', 'orderedList', 'blockquote', 'horizontalRule', 'image'];
const ALLOWED_CHILDREN: Record<string, string[]> = {
  doc: BLOCKS,
  blockquote: ['paragraph'],
  bulletList: ['listItem'],
  orderedList: ['listItem'],
  listItem: ['paragraph', 'bulletList', 'orderedList'],
  paragraph: ['text', 'hardBreak'],
  heading: ['text', 'hardBreak'],
};

function cleanMarks(raw: unknown): Mark[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: Mark[] = [];
  for (const m of raw) {
    if (!m || typeof m !== 'object') continue;
    const type = (m as { type?: unknown }).type;
    if (type === 'bold' || type === 'italic') out.push({ type });
    else if (type === 'link') {
      const href = safeHref((m as { attrs?: { href?: unknown } }).attrs?.href);
      if (href) out.push({ type: 'link', attrs: { href } });
    }
  }
  return out.length ? out : undefined;
}

function cleanNode(raw: unknown, parent: string, depth: number, state: { count: number }): DocNode | null {
  if (!raw || typeof raw !== 'object' || depth > MAX_DEPTH) return null;
  if (++state.count > MAX_NODES) return null;
  const n = raw as { type?: unknown; text?: unknown; attrs?: Record<string, unknown>; marks?: unknown; content?: unknown };
  const type = typeof n.type === 'string' ? n.type : '';
  if (!ALLOWED_CHILDREN[parent]?.includes(type)) return null;

  switch (type) {
    case 'text': {
      if (typeof n.text !== 'string' || !n.text) return null;
      return { type, text: n.text.slice(0, MAX_TEXT), marks: cleanMarks(n.marks) };
    }
    case 'hardBreak':
    case 'horizontalRule':
      return { type };
    case 'image': {
      const src = typeof n.attrs?.src === 'string' ? n.attrs.src : '';
      if (!IMAGE_SRC.test(src)) return null; // only pictures uploaded through our own editor
      const alt = typeof n.attrs?.alt === 'string' ? n.attrs.alt.slice(0, 200) : '';
      const caption = typeof n.attrs?.caption === 'string' ? n.attrs.caption.slice(0, 300) : '';
      const size = (IMAGE_SIZES as readonly string[]).includes(n.attrs?.size as string) ? (n.attrs?.size as ImageSize) : DEFAULT_IMAGE_SIZE;
      const align = (IMAGE_ALIGNS as readonly string[]).includes(n.attrs?.align as string) ? (n.attrs?.align as ImageAlign) : DEFAULT_IMAGE_ALIGN;
      return { type, attrs: { src, alt, caption, size, align } };
    }
    default: {
      const children = Array.isArray(n.content) ? n.content : [];
      const content = children.map((c) => cleanNode(c, type, depth + 1, state)).filter((c): c is DocNode => !!c);
      const node: DocNode = { type, content };
      if (type === 'heading') node.attrs = { level: n.attrs?.level === 3 ? 3 : 2 };
      return node;
    }
  }
}

/** Returns a cleaned copy of the document, or null if the input is not a document at all. */
export function cleanDoc(raw: unknown): Doc | null {
  if (!raw || typeof raw !== 'object' || (raw as { type?: unknown }).type !== 'doc') return null;
  const state = { count: 0 };
  const children = Array.isArray((raw as { content?: unknown }).content) ? (raw as { content: unknown[] }).content : [];
  const content = children.map((c) => cleanNode(c, 'doc', 1, state)).filter((c): c is DocNode => !!c);
  return { type: 'doc', content };
}

/** Reads the stored body. Empty or unreadable bodies become an empty document. */
export function parseStoredBody(body: string): Doc {
  if (!body) return EMPTY_DOC;
  try {
    return cleanDoc(JSON.parse(body)) ?? EMPTY_DOC;
  } catch {
    return EMPTY_DOC;
  }
}

/** The address of the first picture in a post, or null. Used as the post's image in structured data. */
export function firstImageSrc(node: Doc | DocNode): string | null {
  if (node.type === 'image') return (node as DocNode).attrs?.src ?? null;
  for (const child of node.content ?? []) {
    const found = firstImageSrc(child);
    if (found) return found;
  }
  return null;
}

/** All the plain text of a document, for reading time and summaries. */
export function docText(node: Doc | DocNode): string {
  if ('text' in node && node.text) return node.text;
  return (node.content ?? []).map(docText).join(' ');
}

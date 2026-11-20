import React from 'react';
import { type Doc, type DocNode, parseStoredBody } from '@/lib/blogDoc';
import { ALIGN_CLASS, DEFAULT_IMAGE_ALIGN, DEFAULT_IMAGE_SIZE, SIZE_CLASS } from '@/lib/blogImageStyle';

function renderText(node: DocNode, key: string): React.ReactNode {
  let out: React.ReactNode = node.text;
  for (const mark of node.marks ?? []) {
    if (mark.type === 'bold') out = <strong className="font-semibold text-foreground">{out}</strong>;
    else if (mark.type === 'italic') out = <em>{out}</em>;
    else if (mark.type === 'link') {
      out = (
        <a href={mark.attrs.href} className="text-primary underline underline-offset-2 hover:opacity-80" {...(mark.attrs.href.startsWith('http') ? { rel: 'noopener noreferrer' } : {})}>
          {out}
        </a>
      );
    }
  }
  return <React.Fragment key={key}>{out}</React.Fragment>;
}

function renderChildren(nodes: DocNode[] | undefined, key: string): React.ReactNode[] {
  return (nodes ?? []).map((n, i) => renderNode(n, `${key}-${i}`));
}

function renderNode(node: DocNode, key: string): React.ReactNode {
  switch (node.type) {
    case 'text': return renderText(node, key);
    case 'hardBreak': return <br key={key} />;
    case 'horizontalRule': return <hr key={key} className="my-8 border-border" />;
    case 'paragraph': return <p key={key} className="my-4 leading-relaxed text-muted">{renderChildren(node.content, key)}</p>;
    case 'heading':
      return node.attrs?.level === 3
        ? <h3 key={key} className="mt-8 mb-2 text-xl font-semibold text-foreground">{renderChildren(node.content, key)}</h3>
        : <h2 key={key} className="mt-10 mb-3 text-2xl font-bold text-foreground">{renderChildren(node.content, key)}</h2>;
    case 'bulletList': return <ul key={key} className="my-4 list-disc space-y-2 pl-6 text-muted">{renderChildren(node.content, key)}</ul>;
    case 'orderedList': return <ol key={key} className="my-4 list-decimal space-y-2 pl-6 text-muted">{renderChildren(node.content, key)}</ol>;
    case 'listItem': return <li key={key}>{renderChildren(node.content, key)}</li>;
    case 'blockquote': return <blockquote key={key} className="my-6 border-l-4 border-primary/40 pl-4 italic text-muted">{renderChildren(node.content, key)}</blockquote>;
    case 'image': {
      const caption = node.attrs?.caption ?? '';
      return (
        <figure key={key} className={`my-8 ${SIZE_CLASS[node.attrs?.size ?? DEFAULT_IMAGE_SIZE]} ${ALIGN_CLASS[node.attrs?.align ?? DEFAULT_IMAGE_ALIGN]}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={node.attrs?.src} alt={node.attrs?.alt || caption} loading="lazy" className="h-auto w-full rounded-xl border border-border" />
          {caption && <figcaption className="mt-2 text-center text-sm italic text-muted">{caption}</figcaption>}
        </figure>
      );
    }
    default: return null;
  }
}

/** Renders a stored blog post body (or an already-cleaned document) as plain React elements. */
export function BlogContent({ body, doc }: { body?: string; doc?: Doc }) {
  const d = doc ?? parseStoredBody(body ?? '');
  return <div>{renderChildren(d.content, 'd')}</div>;
}

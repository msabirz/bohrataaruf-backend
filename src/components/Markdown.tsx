import React from 'react';

/**
 * A small, safe Markdown renderer for blog posts. It supports what a post needs:
 * ## / ### headings, paragraphs, - and 1. lists, > quotes, **bold**, *italic* and [links](url).
 * Everything is rendered as React text (nothing is inserted as raw HTML), and links may only
 * point to http(s), mailto or this site, so a post cannot inject a script.
 */

function safeHref(href: string): string | null {
  const h = href.trim();
  if (/^https?:\/\//i.test(h) || /^mailto:/i.test(h)) return h;
  if (h.startsWith('/') && !h.startsWith('//')) return h;
  return null;
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${i++}`;
    if (m[1] !== undefined) {
      const href = safeHref(m[2]);
      out.push(
        href ? (
          <a key={key} href={href} className="text-primary underline underline-offset-2 hover:opacity-80" {...(href.startsWith('http') ? { rel: 'noopener noreferrer' } : {})}>
            {m[1]}
          </a>
        ) : (
          m[1]
        ),
      );
    } else if (m[3] !== undefined) {
      out.push(<strong key={key} className="font-semibold text-foreground">{m[3]}</strong>);
    } else {
      out.push(<em key={key}>{m[4]}</em>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = renderInline(heading[2], `h${k}`);
      if (level <= 2) blocks.push(<h2 key={k++} className="mt-10 mb-3 text-2xl font-bold text-foreground">{text}</h2>);
      else blocks.push(<h3 key={k++} className="mt-8 mb-2 text-xl font-semibold text-foreground">{text}</h3>);
      i++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, ''));
      blocks.push(<ul key={k++} className="my-4 list-disc space-y-2 pl-6 text-muted">{items.map((t, n) => <li key={n}>{renderInline(t, `u${k}-${n}`)}</li>)}</ul>);
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ''));
      blocks.push(<ol key={k++} className="my-4 list-decimal space-y-2 pl-6 text-muted">{items.map((t, n) => <li key={n}>{renderInline(t, `o${k}-${n}`)}</li>)}</ol>);
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push(<blockquote key={k++} className="my-6 border-l-4 border-primary/40 pl-4 italic text-muted">{renderInline(quote.join(' '), `q${k}`)}</blockquote>);
      continue;
    }

    // A paragraph runs until the next blank line or the start of another block.
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\s*[-*]\s+|\s*\d+[.)]\s+|>\s?)/.test(lines[i])) para.push(lines[i++]);
    blocks.push(<p key={k++} className="my-4 leading-relaxed text-muted">{renderInline(para.join(' '), `p${k}`)}</p>);
  }

  return <div>{blocks}</div>;
}

import Link from 'next/link';
import { breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from './JsonLd';

export type Crumb = { name: string; path: string };

/**
 * The visible breadcrumb trail AND its BreadcrumbList structured data, built from the same list so
 * the two can never disagree (search engines expect the markup to match what people see).
 * The last item is the current page and is not a link.
 */
export function Breadcrumbs({ items, tone = 'light', align = 'left' }: { items: Crumb[]; tone?: 'light' | 'dark'; align?: 'left' | 'center' }) {
  const dark = tone === 'dark';
  const linkCls = dark ? 'text-[#E8D3A8] hover:text-white' : 'text-muted hover:text-foreground';
  const currentCls = dark ? 'text-[#F3E3C8]' : 'text-foreground';
  const sepCls = dark ? 'text-[#E8D3A8]/50' : 'text-muted/50';
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(items)} />
      <nav aria-label="Breadcrumb" className="mb-6 text-sm">
        <ol className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${align === 'center' ? 'justify-center' : ''}`}>
          {items.map((it, i) => {
            const last = i === items.length - 1;
            return (
              <li key={it.path} className="flex min-w-0 items-center gap-2">
                {last ? (
                  <span aria-current="page" className={`${currentCls} truncate max-w-[70vw] sm:max-w-md`}>{it.name}</span>
                ) : (
                  <>
                    <Link href={it.path} className={`${linkCls} underline-offset-2 hover:underline`}>{it.name}</Link>
                    {/* The separator ends the item, so a wrapped line never starts with a slash. */}
                    <span aria-hidden="true" className={sepCls}>/</span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}

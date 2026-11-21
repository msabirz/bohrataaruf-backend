const LINE_SEPARATOR = new RegExp(String.fromCharCode(0x2028), 'g');
const PARAGRAPH_SEPARATOR = new RegExp(String.fromCharCode(0x2029), 'g');

/**
 * Emits one JSON-LD block. `<` is escaped so that text inside the data (a post title, an event
 * name) can never close the script tag early, and the two line-separator characters are escaped
 * because they break some script parsers.
 */
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(LINE_SEPARATOR, '\\u2028')
    .replace(PARAGRAPH_SEPARATOR, '\\u2029');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

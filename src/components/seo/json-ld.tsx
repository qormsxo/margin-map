export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/** Structured data for search engines. Content is always our own static objects. */
export function JsonLd({ data }: { data: JsonValue }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }}
    />
  );
}

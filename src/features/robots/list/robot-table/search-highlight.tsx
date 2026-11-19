import type { ReactNode } from "react";

export default function SearchHighlight({
  text,
  search,
}: {
  text: string;
  search?: string;
}) {
  if (!search) {
    return text;
  }

  const literalSearch = search.replace(/[.*+?^$(){}|[\]\\]/g, "\\$&");
  const pattern = new RegExp(literalSearch, "giu");
  const parts: ReactNode[] = [];
  let offset = 0;

  for (const match of text.matchAll(pattern)) {
    const start = match.index;
    const matchedText = match[0];

    parts.push(
      text.slice(offset, start),
      <mark key={start}>{matchedText}</mark>,
    );
    offset = start + matchedText.length;
  }

  parts.push(text.slice(offset));
  return parts;
}

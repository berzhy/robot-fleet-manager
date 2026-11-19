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
  const query = search.toLowerCase();
  const value = text.toLowerCase();
  const parts = [];
  let offset = 0;
  let match = value.indexOf(query);
  while (match !== -1) {
    parts.push(text.slice(offset, match));
    parts.push(
      <mark key={match}>{text.slice(match, match + search.length)}</mark>,
    );
    offset = match + search.length;
    match = value.indexOf(query, offset);
  }
  parts.push(text.slice(offset));
  return parts;
}

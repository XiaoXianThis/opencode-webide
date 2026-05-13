import type { Part } from "@opencode-ai/sdk/client";
import { MarkdownView } from "../MarkdownView";

type TextPart = Extract<Part, { type: "text" }>;

function highlightText(text: string, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return text;
  const chunks: Array<{ text: string; hit: boolean }> = [];
  let cursor = 0;
  const lower = text.toLowerCase();
  while (cursor < text.length) {
    const index = lower.indexOf(normalized, cursor);
    if (index === -1) {
      chunks.push({ text: text.slice(cursor), hit: false });
      break;
    }
    if (index > cursor) chunks.push({ text: text.slice(cursor, index), hit: false });
    chunks.push({ text: text.slice(index, index + normalized.length), hit: true });
    cursor = index + normalized.length;
  }
  return chunks.map((chunk, index) =>
    chunk.hit ? (
      <mark key={index} className="rounded-sm bg-warning/30 px-0.5 text-warning" data-testid="message-search-highlight">
        {chunk.text}
      </mark>
    ) : (
      <span key={index}>{chunk.text}</span>
    ),
  );
}

export function TextPartView({ part, searchQuery = "" }: { part: TextPart; searchQuery?: string }) {
  if (searchQuery.trim()) {
    return <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{highlightText(part.text, searchQuery)}</div>;
  }
  return <MarkdownView text={part.text} />;
}

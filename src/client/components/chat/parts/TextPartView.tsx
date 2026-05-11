import type { Part } from "@opencode-ai/sdk/client";
import { MarkdownView } from "../MarkdownView";

type TextPart = Extract<Part, { type: "text" }>;

export function TextPartView({ part }: { part: TextPart }) {
  return <MarkdownView text={part.text} />;
}

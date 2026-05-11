import type { Part } from "@opencode-ai/sdk/client";

type TextPart = Extract<Part, { type: "text" }>;

export function TextPartView({ part }: { part: TextPart }) {
  return (
    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
      {part.text}
    </div>
  );
}

import { Separator } from "@heroui/react";
import type { Part } from "@opencode-ai/sdk/client";

type StepPart = Extract<Part, { type: "step-start" } | { type: "step-finish" }>;

export function StepDividerView({ part }: { part: StepPart }) {
  if (part.type === "step-finish") {
    const tokens = part.tokens.input + part.tokens.output;
    return (
      <div className="flex items-center gap-2 py-0.5 text-[10px] text-default-500">
        <Separator orientation="horizontal" className="flex-1" />
        <span>
          step · {tokens} tokens · ${part.cost.toFixed(4)} · {part.reason}
        </span>
        <Separator orientation="horizontal" className="flex-1" />
      </div>
    );
  }
  return null;
}

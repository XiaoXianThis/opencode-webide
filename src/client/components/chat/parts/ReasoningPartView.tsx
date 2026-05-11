import { Brain } from "lucide-react";
import { Disclosure } from "@heroui/react";
import type { Part } from "@opencode-ai/sdk/client";

type ReasoningPart = Extract<Part, { type: "reasoning" }>;

export function ReasoningPartView({ part }: { part: ReasoningPart }) {
  if (!part.text) return null;
  return (
    <Disclosure className="rounded-medium border border-default-200 bg-content2/40">
      <Disclosure.Heading>
        <Disclosure.Trigger className="flex w-full items-center gap-2 px-2 py-1 text-xs text-default-500 hover:text-foreground">
          <Brain className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">推理过程</span>
          <Disclosure.Indicator />
        </Disclosure.Trigger>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body className="whitespace-pre-wrap break-words border-t border-default-200 px-2 py-1.5 text-xs italic text-default-500">
          {part.text}
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}

import { GitBranch } from "lucide-react";
import { Disclosure, Chip } from "@heroui/react";
import type { Part } from "@opencode-ai/sdk/client";

type SubtaskPart = Extract<Part, { type: "subtask" }>;

/**
 * Renders the `task` tool's spawned subtask: agent name (chip),
 * a short description, and a collapsed prompt (often long).
 */
export function SubtaskPartView({ part }: { part: SubtaskPart }) {
  return (
    <Disclosure
      data-tool="task"
      className="rounded-medium border border-default-200 bg-content2/40"
    >
      <Disclosure.Heading>
        <Disclosure.Trigger className="flex w-full items-center gap-2 px-2 py-1.5 text-xs">
          <GitBranch className="h-3.5 w-3.5 text-default-500" />
          <span className="font-mono text-foreground">task</span>
          <span className="flex-1 truncate text-left text-default-500">
            {part.description || part.agent}
          </span>
          <Chip size="sm" variant="flat" className="h-4 text-[10px]" data-testid="subtask-agent">
            {part.agent}
          </Chip>
          <Disclosure.Indicator />
        </Disclosure.Trigger>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body className="space-y-1 border-t border-default-200 p-2 text-xs">
          <div className="text-[10px] uppercase tracking-wide text-default-500">prompt</div>
          <pre
            className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-medium bg-background p-2 font-mono text-[11px]"
            data-testid="subtask-prompt"
          >
            {part.prompt}
          </pre>
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}

import { Wrench, Loader2, CircleCheck, CircleX, Clock } from "lucide-react";
import { Disclosure } from "@heroui/react";
import type { Part } from "@opencode-ai/sdk/client";
import { cn } from "@/lib/utils";

type ToolPart = Extract<Part, { type: "tool" }>;

const STATUS_ICON = {
  pending: Clock,
  running: Loader2,
  completed: CircleCheck,
  error: CircleX,
} as const;

const STATUS_COLOR = {
  pending: "text-default-500",
  running: "text-warning animate-spin",
  completed: "text-success",
  error: "text-danger",
} as const;

/**
 * Minimal universal tool render. M3 will introduce per-tool views
 * (bash/edit/read/write/grep/todo) with diff and folding.
 */
export function ToolPartView({ part }: { part: ToolPart }) {
  const status = part.state.status;
  const Icon = STATUS_ICON[status];
  const title =
    (part.state.status === "running" || part.state.status === "completed"
      ? part.state.title
      : undefined) ?? part.tool;

  return (
    <Disclosure className="rounded-medium border border-default-200 bg-content2/40">
      <Disclosure.Heading>
        <Disclosure.Trigger className="flex w-full items-center gap-2 px-2 py-1.5 text-xs">
          <Wrench className="h-3.5 w-3.5 text-default-500" />
          <span className="font-mono text-foreground">{part.tool}</span>
          <span className="flex-1 truncate text-left text-default-500">{title}</span>
          <Icon className={cn("h-3.5 w-3.5", STATUS_COLOR[status])} />
          <Disclosure.Indicator />
        </Disclosure.Trigger>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body className="space-y-2 border-t border-default-200 p-2 text-xs">
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wide text-default-500">
              input
            </div>
            <pre className="overflow-x-auto rounded-medium bg-background p-2 font-mono">
              {JSON.stringify(part.state.input, null, 2)}
            </pre>
          </div>
          {part.state.status === "completed" && (
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wide text-default-500">
                output
              </div>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-medium bg-background p-2 font-mono">
                {part.state.output}
              </pre>
            </div>
          )}
          {part.state.status === "error" && (
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wide text-danger">
                error
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-medium bg-danger/10 p-2 font-mono text-danger">
                {part.state.error}
              </pre>
            </div>
          )}
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}

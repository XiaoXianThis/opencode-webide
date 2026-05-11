import { Wrench } from "lucide-react";
import type { Part } from "@opencode-ai/sdk/client";
import { ToolCard, JsonBlock, ErrorBlock, getDuration } from "./ToolCard";

type ToolPart = Extract<Part, { type: "tool" }>;

/**
 * Default fallback tool view: header + raw input/output JSON. Used when no
 * specialised renderer is registered for the tool name.
 */
export function GenericTool({ part }: { part: ToolPart }) {
  const status = part.state.status;
  const title =
    (part.state.status === "running" || part.state.status === "completed"
      ? part.state.title
      : undefined) ?? part.tool;

  return (
    <ToolCard
      tool={part.tool}
      icon={<Wrench className="h-3.5 w-3.5 text-default-500" />}
      status={status}
      title={title}
      durationMs={getDuration(part.state)}
    >
      <JsonBlock label="input" value={part.state.input} />
      {part.state.status === "completed" && (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wide text-default-500">
            output
          </div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-medium bg-background p-2 font-mono text-[11px]">
            {part.state.output}
          </pre>
        </div>
      )}
      {part.state.status === "error" && <ErrorBlock message={part.state.error} />}
    </ToolCard>
  );
}

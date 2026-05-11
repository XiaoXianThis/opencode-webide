import { SearchCheck } from "lucide-react";
import type { Part } from "@opencode-ai/sdk/client";
import { ToolCard, ErrorBlock, getDuration } from "./ToolCard";

type ToolPart = Extract<Part, { type: "tool" }>;

interface WebSearchInput {
  query?: string;
}

export function WebSearchTool({ part }: { part: ToolPart }) {
  const input = part.state.input as WebSearchInput;
  const output = part.state.status === "completed" ? part.state.output : "";

  return (
    <ToolCard
      tool="websearch"
      icon={<SearchCheck className="h-3.5 w-3.5 text-default-500" />}
      status={part.state.status}
      title={input.query ?? "websearch"}
      durationMs={getDuration(part.state)}
    >
      {input.query && (
        <div className="rounded-medium bg-content2/60 p-2 text-[11px]">
          <div className="mb-0.5 text-[10px] uppercase tracking-wide text-default-500">
            query
          </div>
          <span className="text-default-600" data-testid="websearch-query">
            {input.query}
          </span>
        </div>
      )}
      {output && (
        <pre
          className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-medium bg-background p-2 font-mono text-[11px]"
          data-testid="websearch-output"
        >
          {output}
        </pre>
      )}
      {part.state.status === "error" && <ErrorBlock message={part.state.error} />}
    </ToolCard>
  );
}

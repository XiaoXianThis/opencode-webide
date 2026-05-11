import { useMemo } from "react";
import { FolderSearch } from "lucide-react";
import { Chip } from "@heroui/react";
import type { Part } from "@opencode-ai/sdk/client";
import { ToolCard, ErrorBlock, getDuration } from "./ToolCard";

type ToolPart = Extract<Part, { type: "tool" }>;

interface GlobInput {
  pattern?: string;
  path?: string;
}

export function GlobTool({ part }: { part: ToolPart }) {
  const input = part.state.input as GlobInput;
  const output = part.state.status === "completed" ? part.state.output : "";
  const paths = useMemo(
    () => output.split("\n").map((s) => s.trim()).filter(Boolean),
    [output],
  );

  return (
    <ToolCard
      tool="glob"
      icon={<FolderSearch className="h-3.5 w-3.5 text-default-500" />}
      status={part.state.status}
      title={input.pattern ?? "glob"}
      durationMs={getDuration(part.state)}
      trailing={
        <Chip
          size="sm"
          variant="flat"
          className="h-4 text-[10px]"
          data-testid="glob-count"
        >
          {paths.length}
        </Chip>
      }
    >
      {input.pattern && (
        <div className="font-mono text-[11px] text-default-500">
          {input.pattern}
          {input.path ? ` in ${input.path}` : ""}
        </div>
      )}
      {paths.length > 0 ? (
        <ul
          className="max-h-64 space-y-0.5 overflow-auto rounded-medium bg-background p-2 font-mono text-[11px]"
          data-testid="glob-list"
        >
          {paths.map((p) => (
            <li key={p} className="break-all text-foreground">
              {p}
            </li>
          ))}
        </ul>
      ) : (
        part.state.status === "completed" && (
          <div
            className="rounded-medium bg-background p-2 text-[11px] text-default-500"
            data-testid="glob-empty"
          >
            无匹配文件
          </div>
        )
      )}
      {part.state.status === "error" && <ErrorBlock message={part.state.error} />}
    </ToolCard>
  );
}

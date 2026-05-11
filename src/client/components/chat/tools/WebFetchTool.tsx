import { Globe } from "lucide-react";
import { Link } from "@heroui/react";
import type { Part } from "@opencode-ai/sdk/client";
import { ToolCard, ErrorBlock, getDuration } from "./ToolCard";

type ToolPart = Extract<Part, { type: "tool" }>;

interface WebFetchInput {
  url?: string;
  prompt?: string;
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function WebFetchTool({ part }: { part: ToolPart }) {
  const input = part.state.input as WebFetchInput;
  const url = input.url ?? "";
  const safe = isSafeHttpUrl(url);
  const output = part.state.status === "completed" ? part.state.output : "";

  return (
    <ToolCard
      tool="webfetch"
      icon={<Globe className="h-3.5 w-3.5 text-default-500" />}
      status={part.state.status}
      title={url || "webfetch"}
      durationMs={getDuration(part.state)}
    >
      {url &&
        (safe ? (
          <Link
            href={url}
            isExternal
            showAnchorIcon
            rel="noopener noreferrer nofollow"
            className="break-all text-[11px]"
            data-testid="webfetch-link"
          >
            {url}
          </Link>
        ) : (
          <div
            className="break-all font-mono text-[11px] text-default-500"
            data-testid="webfetch-unsafe"
            title="非 http/https 链接，已禁用点击"
          >
            {url}
          </div>
        ))}
      {input.prompt && (
        <div className="rounded-medium bg-content2/60 p-2 text-[11px] text-default-600">
          <div className="mb-0.5 text-[10px] uppercase tracking-wide text-default-500">
            prompt
          </div>
          {input.prompt}
        </div>
      )}
      {output && (
        <pre
          className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-medium bg-background p-2 font-mono text-[11px]"
          data-testid="webfetch-output"
        >
          {output}
        </pre>
      )}
      {part.state.status === "error" && <ErrorBlock message={part.state.error} />}
    </ToolCard>
  );
}

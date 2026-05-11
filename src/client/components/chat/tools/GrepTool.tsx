import { useMemo } from "react";
import { Search } from "lucide-react";
import { Chip } from "@heroui/react";
import type { Part } from "@opencode-ai/sdk/client";
import { ToolCard, ErrorBlock, getDuration } from "./ToolCard";

type ToolPart = Extract<Part, { type: "tool" }>;

interface GrepInput {
  pattern?: string;
  path?: string;
  include?: string;
}

interface GrepMatch {
  file: string;
  line: number;
  text: string;
}

/**
 * Best-effort parser for ripgrep-style output: `path:line:text`. Falls back to
 * raw text when no recognisable matches are found.
 */
function parseMatches(output: string): GrepMatch[] {
  if (!output) return [];
  const re = /^(.+?):(\d+):(.*)$/;
  const out: GrepMatch[] = [];
  for (const line of output.split("\n")) {
    if (!line.trim()) continue;
    const m = re.exec(line);
    if (m) out.push({ file: m[1]!, line: Number(m[2]!), text: m[3]! });
  }
  return out;
}

function highlight(text: string, pattern: string | undefined) {
  if (!pattern) return text;
  let re: RegExp;
  try {
    re = new RegExp(`(${pattern})`, "gi");
  } catch {
    return text;
  }
  const parts = text.split(re);
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded-sm bg-warning/30 px-0.5 text-warning" data-testid="grep-highlight">
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function GrepTool({ part }: { part: ToolPart }) {
  const input = part.state.input as GrepInput;
  const output = part.state.status === "completed" ? part.state.output : "";
  const matches = useMemo(() => parseMatches(output), [output]);
  const grouped = useMemo(() => {
    const map = new Map<string, GrepMatch[]>();
    for (const m of matches) {
      const arr = map.get(m.file) ?? [];
      arr.push(m);
      map.set(m.file, arr);
    }
    return [...map.entries()];
  }, [matches]);

  return (
    <ToolCard
      tool="grep"
      icon={<Search className="h-3.5 w-3.5 text-default-500" />}
      status={part.state.status}
      title={input.pattern ?? "grep"}
      durationMs={getDuration(part.state)}
      trailing={
        matches.length > 0 ? (
          <span className="text-[10px] tabular-nums text-default-400">
            <span data-testid="grep-match-count">{matches.length}</span>
            {" matches in "}
            <span data-testid="grep-file-count">{grouped.length}</span>
            {" files"}
          </span>
        ) : undefined
      }
    >
      {input.pattern && (
        <div className="font-mono text-[11px] text-default-500">
          /{input.pattern}/{input.path ? ` in ${input.path}` : ""}
          {input.include && (
            <Chip size="sm" variant="flat" className="ml-1 h-4 text-[10px]">
              {input.include}
            </Chip>
          )}
        </div>
      )}
      {grouped.length > 0 ? (
        <div className="overflow-x-auto rounded-medium bg-background font-mono text-[11px]" data-testid="grep-results">
          {grouped.map(([file, items]) => (
            <div key={file} className="border-b border-default-200 last:border-0">
              <div className="break-all bg-content2/40 px-2 py-1 text-default-500" data-testid="grep-file">
                {file}{" "}
                <span className="text-[10px] text-default-400">({items.length})</span>
              </div>
              {items.map((m, i) => (
                <div key={i} className="flex gap-2 px-2 leading-5">
                  <span className="w-10 shrink-0 select-none text-right text-default-400">
                    {m.line}
                  </span>
                  <span className="whitespace-pre-wrap break-all text-foreground">
                    {highlight(m.text, input.pattern)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : output ? (
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-medium bg-background p-2 font-mono text-[11px]">
          {output}
        </pre>
      ) : null}
      {part.state.status === "error" && <ErrorBlock message={part.state.error} />}
    </ToolCard>
  );
}

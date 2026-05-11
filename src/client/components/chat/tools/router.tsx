import type { FC } from "react";
import type { Part } from "@opencode-ai/sdk/client";
import { GenericTool } from "./GenericTool";
import { BashTool } from "./BashTool";
import { EditTool } from "./EditTool";
import { ReadTool } from "./ReadTool";
import { WriteTool } from "./WriteTool";
import { GrepTool } from "./GrepTool";
import { GlobTool } from "./GlobTool";
import { WebFetchTool } from "./WebFetchTool";
import { WebSearchTool } from "./WebSearchTool";
import { TodoTool } from "./TodoTool";

type ToolPart = Extract<Part, { type: "tool" }>;
export type ToolView = FC<{ part: ToolPart }>;

/**
 * Lookup table for per-tool views. Names are matched case-insensitively
 * against `ToolPart.tool`. Aliases (e.g. todowrite/todoread) share a single
 * implementation so the agent's bookkeeping tools render the same way.
 */
export const TOOL_REGISTRY: Record<string, ToolView> = {
  bash: BashTool,
  edit: EditTool,
  read: ReadTool,
  write: WriteTool,
  grep: GrepTool,
  glob: GlobTool,
  webfetch: WebFetchTool,
  websearch: WebSearchTool,
  todowrite: TodoTool,
  todoread: TodoTool,
  todo: TodoTool,
};

export function getToolView(toolName: string): ToolView {
  return TOOL_REGISTRY[toolName.toLowerCase()] ?? GenericTool;
}

export function ToolPartRouter({ part }: { part: ToolPart }) {
  const View = getToolView(part.tool);
  return <View part={part} />;
}

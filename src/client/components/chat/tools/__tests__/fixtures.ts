import type { Part, ToolState } from "@opencode-ai/sdk/client";

type ToolPart = Extract<Part, { type: "tool" }>;

export interface MakeToolPartOpts {
  id?: string;
  sessionID?: string;
  messageID?: string;
  callID?: string;
  tool: string;
  state: ToolState;
}

/**
 * Build a fully-typed `ToolPart` for tests with sensible defaults so each
 * tool fixture can focus on what it actually cares about (state shape).
 */
export function makeToolPart(opts: MakeToolPartOpts): ToolPart {
  return {
    id: opts.id ?? "prt_1",
    sessionID: opts.sessionID ?? "ses_1",
    messageID: opts.messageID ?? "msg_1",
    callID: opts.callID ?? "call_1",
    type: "tool",
    tool: opts.tool,
    state: opts.state,
  };
}

export function pendingState(input: Record<string, unknown>): ToolState {
  return { status: "pending", input, raw: "" };
}

export function runningState(
  input: Record<string, unknown>,
  title?: string,
  metadata?: Record<string, unknown>,
): ToolState {
  return {
    status: "running",
    input,
    title,
    metadata,
    time: { start: 1_000 },
  };
}

export function completedState(
  input: Record<string, unknown>,
  output: string,
  opts: {
    title?: string;
    metadata?: Record<string, unknown>;
    duration?: number;
  } = {},
): ToolState {
  return {
    status: "completed",
    input,
    output,
    title: opts.title ?? "",
    metadata: opts.metadata ?? {},
    time: { start: 1_000, end: 1_000 + (opts.duration ?? 250) },
  };
}

export function errorState(
  input: Record<string, unknown>,
  message: string,
  metadata?: Record<string, unknown>,
): ToolState {
  return {
    status: "error",
    input,
    error: message,
    metadata,
    time: { start: 1_000, end: 1_500 },
  };
}

import { describe, it, expect, beforeEach } from "bun:test";
import { render } from "@testing-library/react";
import type { Part } from "@opencode-ai/sdk/client";
import { PartRenderer } from "../PartRenderer";
import { useTodosStore } from "@/store/todos";
import { makeToolPart, completedState, runningState, errorState } from "../tools/__tests__/fixtures";

const SID = "ses_snap";
const MID = "msg_snap";

function base<T extends Part["type"]>(type: T, extra: Record<string, unknown>): Part {
  return { id: `prt_${type}`, sessionID: SID, messageID: MID, type, ...extra } as Part;
}

const FIXTURES: Array<{ name: string; part: Part }> = [
  {
    name: "text",
    part: base("text", { text: "Hello **world** with `code`." }),
  },
  {
    name: "reasoning",
    part: base("reasoning", { text: "internal monologue" }),
  },
  {
    name: "file",
    part: base("file", {
      mime: "image/png",
      filename: "diagram.png",
      url: "https://example.com/d.png",
    }),
  },
  {
    name: "subtask",
    part: base("subtask", {
      prompt: "do the thing",
      description: "investigate",
      agent: "review",
    }),
  },
  {
    name: "step-finish",
    part: base("step-finish", {
      reason: "done",
      cost: 0.0123,
      tokens: { input: 10, output: 20, reasoning: 0, cache: { read: 0, write: 0 } },
    }),
  },
  {
    name: "tool/bash/completed",
    part: makeToolPart({
      tool: "bash",
      state: completedState({ command: "ls" }, "a.ts\nb.ts", { metadata: { exit: 0 } }),
    }),
  },
  {
    name: "tool/edit/completed",
    part: makeToolPart({
      tool: "edit",
      state: completedState(
        { filePath: "/x/y.ts", oldString: "a", newString: "b" },
        "ok",
      ),
    }),
  },
  {
    name: "tool/read/completed",
    part: makeToolPart({
      tool: "read",
      state: completedState({ filePath: "/x/y.ts" }, "line"),
    }),
  },
  {
    name: "tool/write/completed",
    part: makeToolPart({
      tool: "write",
      state: completedState(
        { filePath: "/n/x.ts", content: "x" },
        "ok",
        { metadata: { created: true } },
      ),
    }),
  },
  {
    name: "tool/grep/completed",
    part: makeToolPart({
      tool: "grep",
      state: completedState({ pattern: "foo" }, "src/a.ts:1:foo"),
    }),
  },
  {
    name: "tool/glob/completed",
    part: makeToolPart({
      tool: "glob",
      state: completedState({ pattern: "**/*" }, "a\nb"),
    }),
  },
  {
    name: "tool/webfetch/completed",
    part: makeToolPart({
      tool: "webfetch",
      state: completedState({ url: "https://example.com" }, "summary"),
    }),
  },
  {
    name: "tool/websearch/completed",
    part: makeToolPart({
      tool: "websearch",
      state: completedState({ query: "react" }, "results"),
    }),
  },
  {
    name: "tool/todowrite/completed",
    part: makeToolPart({
      tool: "todowrite",
      state: completedState({ todos: [] }, "ok"),
    }),
  },
  {
    name: "tool/unknown/running",
    part: makeToolPart({ tool: "experimental", state: runningState({ foo: 1 }, "running") }),
  },
  {
    name: "tool/unknown/error",
    part: makeToolPart({ tool: "experimental", state: errorState({}, "boom") }),
  },
];

beforeEach(() => {
  useTodosStore.setState({ bySession: {} });
});

describe("PartRenderer (snapshot)", () => {
  for (const { name, part } of FIXTURES) {
    it(`renders ${name} stably`, () => {
      const { container } = render(<PartRenderer part={part} />);
      // We only snapshot the high-level structure (tag + key data attrs),
      // which is enough to flag accidental routing regressions without
      // tightly coupling to Tailwind class strings.
      expect(summarise(container)).toMatchSnapshot();
    });
  }

  it("renders nothing for synthetic text parts", () => {
    const { container } = render(
      <PartRenderer
        part={base("text", { text: "internal", synthetic: true }) as Part}
      />,
    );
    expect(container.innerHTML).toBe("");
  });
});

function summarise(root: HTMLElement): string {
  // Walk the DOM and emit an indented `tag[data-tool=…|data-status=…|role=…]`
  // tree so snapshots are readable diffs without brittle class assertions.
  const lines: string[] = [];
  function walk(el: Element, depth: number) {
    const tag = el.tagName.toLowerCase();
    const tool = el.getAttribute("data-tool");
    const status = el.getAttribute("data-status");
    const testid = el.getAttribute("data-testid");
    const role = el.getAttribute("role");
    const attrs = [
      tool ? `data-tool=${tool}` : null,
      status ? `data-status=${status}` : null,
      testid ? `data-testid=${testid}` : null,
      role ? `role=${role}` : null,
    ]
      .filter(Boolean)
      .join(" ");
    lines.push(`${"  ".repeat(depth)}${tag}${attrs ? `[${attrs}]` : ""}`);
    for (const child of Array.from(el.children)) walk(child, depth + 1);
  }
  for (const child of Array.from(root.children)) walk(child, 0);
  return lines.join("\n");
}

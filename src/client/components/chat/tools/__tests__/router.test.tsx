import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import { getToolView, ToolPartRouter, TOOL_REGISTRY } from "../router";
import { GenericTool } from "../GenericTool";
import { BashTool } from "../BashTool";
import { EditTool } from "../EditTool";
import { ReadTool } from "../ReadTool";
import { WriteTool } from "../WriteTool";
import { GrepTool } from "../GrepTool";
import { GlobTool } from "../GlobTool";
import { WebFetchTool } from "../WebFetchTool";
import { WebSearchTool } from "../WebSearchTool";
import { TodoTool } from "../TodoTool";
import { makeToolPart, completedState } from "./fixtures";

describe("getToolView", () => {
  it.each([
    ["bash", BashTool],
    ["edit", EditTool],
    ["read", ReadTool],
    ["write", WriteTool],
    ["grep", GrepTool],
    ["glob", GlobTool],
    ["webfetch", WebFetchTool],
    ["websearch", WebSearchTool],
    ["todowrite", TodoTool],
    ["todoread", TodoTool],
  ])("routes %s to its dedicated component", (name, expected) => {
    expect(getToolView(name)).toBe(expected);
  });

  it("matches case-insensitively", () => {
    expect(getToolView("BASH")).toBe(BashTool);
    expect(getToolView("WebFetch")).toBe(WebFetchTool);
  });

  it("falls back to GenericTool for unknown tool names", () => {
    expect(getToolView("totally-made-up")).toBe(GenericTool);
  });

  it("registry only exposes the documented aliases", () => {
    // Sanity check so adding a tool here forces an update to the test list.
    expect(Object.keys(TOOL_REGISTRY).sort()).toEqual(
      [
        "bash",
        "edit",
        "glob",
        "grep",
        "read",
        "todo",
        "todoread",
        "todowrite",
        "webfetch",
        "websearch",
        "write",
      ].sort(),
    );
  });
});

describe("ToolPartRouter", () => {
  it("renders the matching specialised view for known tools", () => {
    const part = makeToolPart({
      tool: "bash",
      state: completedState({ command: "ls" }, "file.txt"),
    });
    render(<ToolPartRouter part={part} />);
    // BashTool renders the tool name as a monospace pill.
    expect(screen.getByText("bash")).toBeInTheDocument();
  });

  it("renders GenericTool for unknown tools", () => {
    const part = makeToolPart({
      tool: "mystery_tool",
      state: completedState({ key: "value" }, "ok"),
    });
    render(<ToolPartRouter part={part} />);
    expect(screen.getByText("mystery_tool")).toBeInTheDocument();
  });
});

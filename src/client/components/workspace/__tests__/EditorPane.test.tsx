import { beforeEach, describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import { useWorkspaceStore } from "@/store/workspace";
import { EditorPane } from "../EditorPane";

beforeEach(() => {
  useWorkspaceStore.setState({ tabs: [], activeTabId: null, buffers: {}, dirty: new Set(), status: "idle", error: null });
});

describe("EditorPane", () => {
  it("renders readonly fallback when no editor dependency is mounted", () => {
    useWorkspaceStore.setState({ tabs: [{ id: "a.ts", path: "a.ts", name: "a.ts" }], activeTabId: "a.ts", buffers: { "a.ts": "const value = 1;" } });
    render(<EditorPane />);
    expect(screen.getByTestId("editor-pane")).toHaveTextContent("const value = 1;");
  });

  it("renders empty guidance without an active file", () => {
    render(<EditorPane />);
    expect(screen.getByText("选择文件开始浏览")).toBeInTheDocument();
  });
});

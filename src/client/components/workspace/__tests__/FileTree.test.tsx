import { beforeEach, describe, expect, it, mock } from "bun:test";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FileNode } from "@opencode-ai/sdk/client";
import { useFilesStore } from "@/store/files";
import { useWorkspaceStore } from "@/store/workspace";

const listFn = mock(async (_args: { query: { path: string } }) => ({ data: [] as FileNode[] }));
const readFn = mock(async (_args: { query: { path: string } }) => ({ data: { type: "text" as const, content: "" } }));

mock.module("@/lib/opencode", () => ({ oc: { file: { list: listFn, read: readFn, status: mock(async () => ({ data: [] })) } } }));

const { FileTree } = await import("../FileTree");

function node(path: string, type: "file" | "directory"): FileNode {
  return { name: path.split("/").at(-1) ?? path, path, absolute: `/repo/${path}`, type, ignored: false };
}

beforeEach(() => {
  listFn.mockClear();
  readFn.mockClear();
  listFn.mockImplementation(async (args: { query: { path: string } }) => ({ data: args.query.path === "." ? [node("src", "directory"), node("README.md", "file")] : [node("src/app.tsx", "file")] }));
  useFilesStore.setState({ nodesByPath: {}, expanded: new Set(), statusByPath: {}, loading: {}, status: "idle", error: null });
  useWorkspaceStore.setState({ tabs: [], activeTabId: null, buffers: {}, dirty: new Set(), status: "idle", error: null });
});

describe("FileTree", () => {
  it("expands directories on click", async () => {
    const user = userEvent.setup();
    render(<FileTree />);
    expect(await screen.findByText("src")).toBeInTheDocument();
    await user.click(screen.getByText("src"));
    expect(await screen.findByText("app.tsx")).toBeInTheDocument();
  });

  it("opens files on click", async () => {
    const user = userEvent.setup();
    render(<FileTree />);
    await user.click(await screen.findByText("README.md"));
    expect(useWorkspaceStore.getState().activeTabId).toBe("README.md");
  });

  it("virtualizes large directories", () => {
    useFilesStore.setState({ nodesByPath: { ".": Array.from({ length: 220 }, (_, index) => node(`file-${index}.ts`, "file")) }, status: "ready" });
    render(<FileTree />);
    const tree = screen.getByRole("tree", { name: "文件树" });
    expect(within(tree).getAllByRole("button")).toHaveLength(200);
    expect(screen.getByTestId("file-tree-virtualized")).toHaveTextContent("前 200 项");
  });
});

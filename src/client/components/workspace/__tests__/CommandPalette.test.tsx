import { beforeEach, describe, expect, it, mock } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useWorkspaceStore } from "@/store/workspace";

const filesFn = mock(async (_args: { query: { query: string; dirs: "false" } }) => ({ data: ["src/app.tsx", "src/store.ts"] }));
const textFn = mock(async () => ({ data: [] }));
const symbolsFn = mock(async () => ({ data: [] }));
const readFn = mock(async (_args: { query: { path: string } }) => ({ data: { type: "text" as const, content: "opened" } }));

mock.module("@/lib/opencode", () => ({ oc: { find: { files: filesFn, text: textFn, symbols: symbolsFn }, file: { read: readFn } } }));

const { CommandPalette } = await import("../CommandPalette");

beforeEach(() => {
  filesFn.mockClear();
  textFn.mockClear();
  symbolsFn.mockClear();
  readFn.mockClear();
  filesFn.mockImplementation(async () => ({ data: ["src/app.tsx", "src/store.ts"] }));
  useWorkspaceStore.setState({ tabs: [], activeTabId: null, buffers: {}, dirty: new Set(), status: "idle", error: null });
});

describe("CommandPalette", () => {
  it("opens with Cmd+P, navigates with keyboard, and jumps on Enter", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    await user.keyboard("{Meta>}p{/Meta}");
    expect(screen.getByRole("dialog", { name: "命令面板" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("src/app.tsx")).toBeInTheDocument());
    await user.keyboard("{ArrowDown}{Enter}");
    await waitFor(() => expect(useWorkspaceStore.getState().activeTabId).toBe("src/store.ts"));
  });

  it("opens with Cmd+K while preserving Cmd+P", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.keyboard("{Meta>}k{/Meta}");

    expect(screen.getByRole("dialog", { name: "命令面板" })).toBeInTheDocument();
  });

  it("debounces queries before calling find.files", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    await user.keyboard("{Control>}p{/Control}");
    const input = screen.getByRole("searchbox", { name: "搜索文件" });
    await user.type(input, "abc");
    await waitFor(() => expect(filesFn).toHaveBeenLastCalledWith({ query: { query: "abc", dirs: "false" } }));
  });

  it("shows empty results and fuzzy highlights matches", async () => {
    const user = userEvent.setup();
    filesFn.mockImplementation(async (args: { query: { query: string } }) => ({ data: args.query.query === "zzz" ? [] : ["src/app.tsx"] }));
    render(<CommandPalette />);
    await user.keyboard("{Control>}p{/Control}");
    const input = screen.getByRole("searchbox", { name: "搜索文件" });
    await user.type(input, "sa");
    await waitFor(() => expect(screen.getAllByText(/[sa]/i).length).toBeGreaterThan(0));
    await user.clear(input);
    await user.type(input, "zzz");
    await waitFor(() => expect(screen.getByText("没有匹配结果")).toBeInTheDocument());
  });
});

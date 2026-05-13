import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { Event, FileContent } from "@opencode-ai/sdk/client";

const readFn = mock(async (_args: { query: { path: string } }) => ({ data: text("initial") }));
const listFn = mock(async (_args: { query: { path: string } }) => ({ data: [] }));

mock.module("@/lib/opencode", () => ({ oc: { file: { read: readFn, list: listFn, status: mock(async () => ({ data: [] })) } } }));

const { useWorkspaceStore } = await import("../workspace");

function text(content: string): FileContent {
  return { type: "text", content };
}

beforeEach(() => {
  readFn.mockClear();
  listFn.mockClear();
  readFn.mockImplementation(async () => ({ data: text("initial") }));
  useWorkspaceStore.setState({ tabs: [], activeTabId: null, buffers: {}, dirty: new Set(), status: "idle", error: null });
});

describe("workspace store", () => {
  it("openFile creates a tab, makes it active, and reads the buffer", async () => {
    await useWorkspaceStore.getState().openFile("src/app.tsx");
    expect(readFn).toHaveBeenCalledWith({ query: { path: "src/app.tsx" } });
    expect(useWorkspaceStore.getState().tabs[0]?.name).toBe("app.tsx");
    expect(useWorkspaceStore.getState().activeTabId).toBe("src/app.tsx");
    expect(useWorkspaceStore.getState().buffers["src/app.tsx"]).toBe("initial");
  });

  it("closeTab and switchTab maintain active tab", async () => {
    await useWorkspaceStore.getState().openFile("a.ts");
    await useWorkspaceStore.getState().openFile("b.ts");
    useWorkspaceStore.getState().switchTab("a.ts");
    expect(useWorkspaceStore.getState().activeTabId).toBe("a.ts");
    useWorkspaceStore.getState().closeTab("a.ts");
    expect(useWorkspaceStore.getState().activeTabId).toBe("b.ts");
  });

  it("edit marks dirty and save clears dirty without writeback", async () => {
    await useWorkspaceStore.getState().openFile("a.ts");
    useWorkspaceStore.getState().edit("a.ts", "changed");
    expect(useWorkspaceStore.getState().dirty.has("a.ts")).toBe(true);
    await useWorkspaceStore.getState().save("a.ts");
    expect(useWorkspaceStore.getState().dirty.has("a.ts")).toBe(false);
  });

  it("watcher events reload clean buffers but preserve dirty buffers", async () => {
    await useWorkspaceStore.getState().openFile("src/a.ts");
    readFn.mockImplementation(async () => ({ data: text("external") }));
    useWorkspaceStore.getState().applyEvent({ type: "file.watcher.updated", properties: { file: "src/a.ts", event: "change" } } as Event);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(useWorkspaceStore.getState().buffers["src/a.ts"]).toBe("external");
    useWorkspaceStore.getState().edit("src/a.ts", "dirty");
    readFn.mockImplementation(async () => ({ data: text("ignored") }));
    useWorkspaceStore.getState().applyEvent({ type: "file.watcher.updated", properties: { file: "src/a.ts", event: "change" } } as Event);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(useWorkspaceStore.getState().buffers["src/a.ts"]).toBe("dirty");
  });
});

import { beforeEach, describe, expect, it, mock } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useWorkspaceStore } from "@/store/workspace";
import { EditorTabs } from "../EditorTabs";

beforeEach(() => {
  useWorkspaceStore.setState({ tabs: [], activeTabId: null, buffers: {}, dirty: new Set(), status: "idle", error: null });
});

describe("EditorTabs", () => {
  it("syncs tabs with the workspace store and switches active tab", async () => {
    const user = userEvent.setup();
    useWorkspaceStore.setState({ tabs: [{ id: "a.ts", path: "a.ts", name: "a.ts" }, { id: "b.ts", path: "b.ts", name: "b.ts" }], activeTabId: "a.ts" });
    render(<EditorTabs />);
    await user.click(screen.getByText("b.ts"));
    expect(useWorkspaceStore.getState().activeTabId).toBe("b.ts");
  });

  it("confirms before closing a dirty tab", async () => {
    const user = userEvent.setup();
    const confirmFn = mock(() => false);
    globalThis.confirm = confirmFn;
    useWorkspaceStore.setState({ tabs: [{ id: "a.ts", path: "a.ts", name: "a.ts" }], activeTabId: "a.ts", dirty: new Set(["a.ts"]) });
    render(<EditorTabs />);
    await user.click(screen.getByRole("button", { name: "关闭 a.ts" }));
    expect(confirmFn).toHaveBeenCalled();
    expect(useWorkspaceStore.getState().tabs).toHaveLength(1);
  });
});

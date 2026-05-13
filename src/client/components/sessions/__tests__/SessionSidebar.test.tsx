import { beforeEach, describe, expect, it, mock } from "bun:test";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSyncExternalStore } from "react";
import type { Session } from "@opencode-ai/sdk/client";

type StoreState = {
  sessions: Session[];
  childrenByParent: Record<string, Session[]>;
  searchQuery: string;
  activeId: string | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  refresh: ReturnType<typeof mock>;
  create: ReturnType<typeof mock>;
  remove: ReturnType<typeof mock>;
  rename: ReturnType<typeof mock>;
  share: ReturnType<typeof mock>;
  unshare: ReturnType<typeof mock>;
  loadChildren: ReturnType<typeof mock>;
  filteredSessions: () => Session[];
  setSearchQuery: (query: string) => void;
  setActive: ReturnType<typeof mock>;
};

const listeners = new Set<() => void>();
let state: StoreState = makeState();

function session(id: string, updated: number, title = id, parentID?: string): Session {
  return {
    id,
    projectID: "project",
    directory: "/repo",
    title,
    parentID,
    version: "1.0.0",
    time: { created: updated - 1, updated },
  };
}

function makeState(overrides: Partial<StoreState> = {}): StoreState {
  const base = {
    sessions: [],
    childrenByParent: {},
    searchQuery: "",
    activeId: null,
    status: "ready" as const,
    error: null,
    refresh: mock(async () => {}),
    create: mock(async () => null),
    remove: mock(async () => {}),
    rename: mock(async (_id: string, _title: string) => {}),
    share: mock(async () => null),
    unshare: mock(async () => {}),
    loadChildren: mock(async () => []),
    setActive: mock((_id: string | null) => {}),
  };
  return {
    ...base,
    filteredSessions: () => {
      const query = state.searchQuery.trim().toLocaleLowerCase();
      if (!query) return state.sessions;
      return state.sessions.filter((item) => item.title.toLocaleLowerCase().includes(query));
    },
    setSearchQuery: (query: string) => {
      state = { ...state, searchQuery: query };
      emit();
    },
    ...overrides,
  };
}

function emit() {
  for (const listener of listeners) listener();
}

mock.module("@/store/sessions", () => ({
  useSessionsStore: Object.assign(
    <T,>(selector: (value: StoreState) => T): T =>
      useSyncExternalStore(
        (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        () => selector(state),
        () => selector(state),
      ),
    {
      getState: () => state,
      setState: (patch: Partial<StoreState>) => {
        state = { ...state, ...patch };
        emit();
      },
    },
  ),
}));

const { SessionSidebar } = await import("../SessionSidebar");

beforeEach(() => {
  listeners.clear();
  state = makeState({
    sessions: [session("parent", 300, "Parent"), session("other", 200, "Other")],
    activeId: "parent",
  });
});

describe("SessionSidebar", () => {
  it("double-click edits the title, Enter saves, and Escape cancels", async () => {
    const user = userEvent.setup();
    render(<SessionSidebar />);

    await user.dblClick(screen.getByText("Parent"));
    const input = screen.getByLabelText("编辑会话标题 Parent");
    await user.clear(input);
    await user.type(input, "Renamed{enter}");

    expect(state.rename).toHaveBeenCalledWith("parent", "Renamed");

    await user.dblClick(screen.getByText("Parent"));
    await user.type(screen.getByLabelText("编辑会话标题 Parent"), " Draft{escape}");

    expect(state.rename).toHaveBeenCalledTimes(1);
  });

  it("debounces case-insensitive search input before filtering", async () => {
    const user = userEvent.setup({ advanceTimers: () => {} });
    render(<SessionSidebar />);

    await user.type(screen.getByLabelText("搜索会话"), "par");
    expect(state.searchQuery).toBe("");

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 280));
    });

    expect(state.searchQuery).toBe("par");
    expect(screen.getByText("Parent")).toBeInTheDocument();
    expect(screen.queryByText("Other")).toBeNull();
  });

  it("renders child sessions indented after loadChildren populates the tree", () => {
    state = makeState({
      sessions: [session("parent", 300, "Parent")],
      childrenByParent: { parent: [session("child", 200, "Child", "parent")] },
      activeId: "parent",
    });

    render(<SessionSidebar />);

    const childButton = screen.getByLabelText("加载子会话 Child");
    expect(childButton.parentElement).toHaveStyle("padding-left: 12px");
  });

  it("exposes share and unshare actions", async () => {
    const user = userEvent.setup();
    state = makeState({
    sessions: [
      session("plain", 300, "Plain"),
      { ...session("shared", 200, "Shared"), share: { url: "https://share" } },
    ],
      activeId: "plain",
    });

    render(<SessionSidebar />);
    await user.click(screen.getByLabelText("分享会话 Plain"));
    await user.click(screen.getByLabelText("取消分享 Shared"));

    expect(state.share).toHaveBeenCalledWith("plain");
    expect(state.unshare).toHaveBeenCalledWith("shared");
  });
});

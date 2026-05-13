import { beforeEach, describe, expect, it, mock } from "bun:test";
import { act, cleanup, render, screen } from "@testing-library/react";
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
  fork: ReturnType<typeof mock>;
  share: ReturnType<typeof mock>;
  unshare: ReturnType<typeof mock>;
  setActive: ReturnType<typeof mock>;
  filteredSessions: () => Session[];
  setSearchQuery: (query: string) => void;
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

function emit() {
  for (const listener of listeners) listener();
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
    fork: mock(async () => null),
    share: mock(async () => null),
    unshare: mock(async () => {}),
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
  cleanup();
  listeners.clear();
  state = makeState({
    sessions: [session("parent", 300, "Parent"), session("other", 200, "Other")],
    activeId: "parent",
  });
});

describe("SessionSidebar", () => {
  it("renders the active session and actions", () => {
    render(<SessionSidebar />);

    expect(screen.getByText("Parent")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Parent/).length).toBeGreaterThan(0);
  });

  it("debounces case-insensitive search input before filtering", async () => {
    const user = userEvent.setup({ advanceTimers: () => {} });
    render(<SessionSidebar />);

    await user.type(screen.getByRole("textbox"), "par");
    expect(state.searchQuery).toBe("");

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 280));
    });

    expect(state.searchQuery).toBe("par");
    expect(screen.getByText("Parent")).toBeInTheDocument();
    expect(screen.queryByText("Other")).toBeNull();
  });

  it("renders child sessions indented after children populate the tree", () => {
    state = makeState({
      sessions: [session("parent", 300, "Parent")],
      childrenByParent: { parent: [session("child", 200, "Child", "parent")] },
      activeId: "parent",
    });

    render(<SessionSidebar />);

    expect(screen.getByText("Child").closest("div")).toHaveStyle("padding-left: 12px");
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
    await user.click(screen.getByLabelText(/^会话操作 Plain$/));
    await user.click(screen.getByLabelText(/^分享会话 Plain$/));
    const shareMock = state.share;

    cleanup();
    state = makeState({
      sessions: [{ ...session("shared", 200, "Shared"), share: { url: "https://share" } }],
      activeId: "shared",
    });
    render(<SessionSidebar />);
    await user.click(screen.getByLabelText(/^会话操作 Shared$/));
    await user.click(screen.getByLabelText(/^取消分享 Shared$/));

    expect(shareMock).toHaveBeenCalledWith("plain");
    expect(state.unshare).toHaveBeenCalledWith("shared");
  });
});

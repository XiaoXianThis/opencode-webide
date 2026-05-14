import { beforeEach, describe, expect, it, mock } from "bun:test";
import { useSyncExternalStore } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import type { Project, Session } from "@opencode-ai/sdk/client";
import { setCsrfToken } from "@/lib/auth";

type StoreMock<T> = ((selector: (state: T) => unknown) => unknown) & {
  setState: (partial: Partial<T>) => void;
  getState: () => T;
};

function createStoreMock<T extends object>(state: T): StoreMock<T> {
  const listeners = new Set<() => void>();
  let version = 0;
  return Object.assign(
    (selector: (value: T) => unknown): unknown => {
      useSyncExternalStore(
        (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        () => version,
      );
      return selector(state);
    },
    {
      setState: (partial: Partial<T>) => {
        Object.assign(state, partial);
        version += 1;
        for (const listener of listeners) listener();
      },
      getState: () => state,
    },
  );
}

interface ModelOptionFixture {
  providerID: string;
  providerName: string;
  modelID: string;
  modelName: string;
  status: "active";
  contextLimit: number;
  outputLimit: number;
  costInput: number;
  costOutput: number;
  isDefault: boolean;
}

const projectsState = {
  projects: [] as Project[],
  activeProjectId: null as string | null,
  status: "ready",
  error: null as string | null,
  load: mock(async () => {}),
  select: (id: string) => {
    if (projectsState.projects.some((project) => project.id === id)) {
      useProjectsStore.setState({ activeProjectId: id });
    }
  },
  active: () =>
    projectsState.projects.find(
      (project) => project.id === projectsState.activeProjectId,
    ) ?? null,
};

const sessionsState = {
  sessions: [] as Session[],
  activeId: null as string | null,
  childrenByParent: {} as Record<string, Session[]>,
  status: "ready",
  error: null as string | null,
  searchQuery: "",
  refresh: mock(async () => {}),
  create: mock(async () => null),
  remove: mock(async () => {}),
  rename: mock(async () => {}),
  fork: mock(async () => null),
  share: mock(async () => null),
  unshare: mock(async () => {}),
  summarize: mock(async () => {}),
  setSearchQuery: (query: string) => {
    useSessionsStore.setState({ searchQuery: query });
  },
  filteredSessions: () => {
    const query = sessionsState.searchQuery.trim().toLowerCase();
    if (!query) return sessionsState.sessions;
    return sessionsState.sessions.filter((session) =>
      (session.title || session.id).toLowerCase().includes(query),
    );
  },
  setActive: (id: string | null) => {
    useSessionsStore.setState({ activeId: id });
  },
};

const messagesState = {
  sessions: {},
  loading: {},
  loadError: {},
  streaming: {} as Record<string, boolean>,
  loadMessages: mock(async () => {}),
  abort: mock(async () => {}),
};

const modelsState = {
  options: [] as ModelOptionFixture[],
  providers: [],
  defaults: {} as Record<string, string>,
  selectedProviderID: null as string | null,
  selectedModelID: null as string | null,
  status: "ready",
  error: null as string | null,
  fallbackNotice: null as string | null,
  load: mock(async () => {}),
  select: (providerID: string, modelID: string) => {
    modelsState.selectedProviderID = providerID;
    modelsState.selectedModelID = modelID;
  },
  current: () =>
    modelsState.options.find(
      (option) =>
        option.providerID === modelsState.selectedProviderID &&
        option.modelID === modelsState.selectedModelID,
    ) ?? null,
};

const permissionsState = {
  bySession: {} as Record<
    string,
    Array<{ id: string; sessionID: string; title: string }>
  >,
  pending: {},
  totalCount: () =>
    Object.values(permissionsState.bySession).reduce(
      (sum, permissions) => sum + permissions.length,
      0,
    ),
};

const useProjectsStore = createStoreMock(projectsState);
const useSessionsStore = createStoreMock(sessionsState);
const useMessagesStoreMock = createStoreMock(messagesState);
const useModelsStore = createStoreMock(modelsState);
const usePermissionsStore = createStoreMock(permissionsState);

mock.module("@/store/projects", () => ({ useProjectsStore }));
mock.module("@/store/sessions", () => ({ useSessionsStore }));

mock.module("@/store/messages", () => ({
  useMessagesStore: useMessagesStoreMock,
}));
mock.module("@/store/models", () => ({ useModelsStore }));
mock.module("@/store/permissions", () => ({ usePermissionsStore }));

mock.module("@/lib/opencode", () => ({
  oc: {
    project: {
      list: mock(async () => ({ data: [] })),
      current: mock(async () => ({ data: null })),
    },
    session: { list: mock(async () => ({ data: [] })) },
  },
}));

const summarizeFn = mock(async () => {});
const logoutFetchFn = mock(async () => new Response(null, { status: 204 }));

mock.module("@/components/chat/MessageList", () => ({
  MessageList: ({
    sessionID,
    searchQuery = "",
  }: {
    sessionID: string;
    searchQuery?: string;
  }) => (
    <div data-testid="message-list">
      {sessionID}:{searchQuery}
    </div>
  ),
}));

mock.module("@/components/chat/Composer", () => ({
  Composer: ({ sessionID }: { sessionID: string }) => (
    <div>Composer {sessionID}</div>
  ),
}));

const { MobileAppShell } = await import("../MobileAppShell");
const { MobileChatPage, MobileMePage, MobileProjectsPage } =
  await import("../MobilePages");

function renderMobile(path = "/m/projects") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/m" element={<MobileAppShell />}>
          <Route path="projects" element={<MobileProjectsPage />} />
          <Route path="chat" element={<div>Chat route</div>} />
          <Route path="files" element={<div>Files route</div>} />
          <Route path="terminal" element={<div>Terminal route</div>} />
          <Route path="me/*" element={<MobileMePage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function renderMobileChat(path = "/m/chat") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/m/chat" element={<MobileChatPage />} />
        <Route path="/m/chat/:sessionId" element={<MobileChatPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  const projects: Project[] = [
    { id: "p1", worktree: "/repo/alpha", time: { created: 1 } },
    { id: "p2", worktree: "/repo/beta", time: { created: 2 } },
  ];
  useProjectsStore.setState({
    projects,
    activeProjectId: "p1",
    status: "ready",
    error: null,
  });
  const sessions: Session[] = [
    {
      id: "s1",
      projectID: "p1",
      directory: "/repo/alpha",
      title: "Alpha chat",
      version: "1.0.0",
      time: { created: 1, updated: 2 },
    },
    {
      id: "s2",
      projectID: "p1",
      directory: "/repo/alpha",
      title: "Beta chat",
      version: "1.0.0",
      time: { created: 2, updated: 3 },
    },
  ];
  useSessionsStore.setState({
    sessions,
    activeId: "s1",
    status: "ready",
    error: null,
    summarize: summarizeFn,
  });
  useMessagesStoreMock.setState({
    sessions: {},
    loading: {},
    loadError: {},
    streaming: { s1: true },
  });
  const option: ModelOptionFixture = {
    providerID: "anthropic",
    providerName: "Anthropic",
    modelID: "claude-sonnet",
    modelName: "Claude Sonnet",
    status: "active",
    contextLimit: 200000,
    outputLimit: 8000,
    costInput: 0.000001,
    costOutput: 0.000002,
    isDefault: true,
  };
  useModelsStore.setState({
    options: [option],
    providers: [],
    defaults: { anthropic: "claude-sonnet" },
    selectedProviderID: "anthropic",
    selectedModelID: "claude-sonnet",
    status: "ready",
    error: null,
    fallbackNotice: null,
  });
  usePermissionsStore.setState({
    bySession: {
      s1: [
        {
          id: "perm1",
          sessionID: "s1",
          title: "Allow tool?",
        },
      ],
    },
    pending: {},
  });
  summarizeFn.mockClear();
  messagesState.loadMessages.mockClear();
  messagesState.abort.mockClear();
  logoutFetchFn.mockClear();
  setCsrfToken("csrf-test-token");
  globalThis.fetch = Object.assign(logoutFetchFn, {
    preconnect: mock(() => {}),
  });
});

describe("MobileAppShell", () => {
  it("renders safe-area shell and bottom tabs", () => {
    const { container } = renderMobile();

    expect(container.querySelector(".mobile-app-shell")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "移动端主导航" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /聊天/ })).toHaveAttribute(
      "href",
      "/m/chat",
    );
  });

  it("switches project and navigates to chat", async () => {
    const user = userEvent.setup();
    renderMobile();

    await user.click(screen.getByText("beta"));

    expect(useProjectsStore.getState().activeProjectId).toBe("p2");
    expect(await screen.findByText("Chat route")).toBeInTheDocument();
  });

  it("passes mobile chat search into MessageList and exposes active-session actions", async () => {
    const user = userEvent.setup();
    renderMobileChat();

    await user.type(
      screen.getByRole("textbox", { name: "搜索当前会话消息" }),
      "needle",
    );
    expect(screen.getByTestId("message-list")).toHaveTextContent("s1:needle");
    expect(
      screen.getByTestId("mobile-chat-permission-indicator"),
    ).toHaveTextContent("1");

    await user.click(screen.getByRole("button", { name: "总结" }));
    await user.click(screen.getByRole("button", { name: "中止" }));

    expect(summarizeFn).toHaveBeenCalledWith("s1", {
      providerID: "anthropic",
      modelID: "claude-sonnet",
    });
    expect(messagesState.abort).toHaveBeenCalledWith("s1");
  });

  it("deep-links selected drawer sessions on mobile chat", async () => {
    const user = userEvent.setup();
    renderMobileChat();

    await user.click(screen.getByRole("button", { name: "会话列表" }));
    await user.click(await screen.findByLabelText(/加载子会话 Beta chat/));

    expect(useSessionsStore.getState().activeId).toBe("s2");
    expect(screen.getByTestId("message-list")).toHaveTextContent("s2:");
  });

  it("renders route-aware settings pages and navigates back from /m/me subroutes", async () => {
    const user = userEvent.setup();
    renderMobile("/m/me/provider");

    expect(
      screen.getByRole("region", { name: "移动模型 Provider" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Claude Sonnet/ }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "返回" }));

    expect(
      await screen.findByRole("link", { name: /权限中心/ }),
    ).toHaveAttribute("href", "/m/me/permissions");
    await user.click(screen.getByRole("link", { name: /账户/ }));
    expect(await screen.findByText("账户信息")).toBeInTheDocument();
    expect(screen.getByText("已连接")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "退出登录" }));
    expect(logoutFetchFn).toHaveBeenCalledWith(
      "/api/auth/logout",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

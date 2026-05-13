import { beforeEach, describe, expect, it, mock } from "bun:test";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSyncExternalStore } from "react";
import type { AssistantMessage, Part, Session, UserMessage } from "@opencode-ai/sdk/client";

type SessionFixture = {
  messageOrder: string[];
  messages: Record<string, UserMessage | AssistantMessage>;
  parts: Record<string, { partOrder: string[]; byId: Record<string, Part> }>;
};

type MessagesState = {
  sessions: Record<string, SessionFixture>;
  loading: Record<string, boolean>;
  loadError: Record<string, string | undefined>;
  streaming: Record<string, boolean>;
  sendPrompt: ReturnType<typeof mock>;
};

type StoreUpdate = Partial<MessagesState> | ((state: MessagesState) => Partial<MessagesState>);

type MockMessagesStore = {
  <T>(selector: (state: MessagesState) => T): T;
  getState: () => MessagesState;
  setState: (update: StoreUpdate) => void;
};

type SessionsState = {
  sessions: Session[];
  fork: ReturnType<typeof mock>;
  revert: ReturnType<typeof mock>;
  unrevert: ReturnType<typeof mock>;
  activeId?: string | null;
  error?: string | null;
};

type SessionStoreUpdate = Partial<SessionsState> | ((state: SessionsState) => Partial<SessionsState>);

const SID = "ses_message_list";
const listeners = new Set<() => void>();
let messagesState: MessagesState = emptyState();
let sessionsState: SessionsState = emptySessionsState();

function emptyState(): MessagesState {
  return { sessions: {}, loading: {}, loadError: {}, streaming: {}, sendPrompt: mock(async () => {}) };
}

const useMessagesStore: MockMessagesStore = Object.assign(
  <T,>(selector: (state: MessagesState) => T): T =>
    useSyncExternalStore(
      (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      () => selector(messagesState),
      () => selector(messagesState),
    ),
  {
    getState: () => messagesState,
    setState: (update: StoreUpdate) => {
      const patch = typeof update === "function" ? update(messagesState) : update;
      messagesState = { ...messagesState, ...patch };
      for (const listener of listeners) listener();
    },
  },
);

function emptySessionsState(): SessionsState {
  return {
    sessions: [],
    fork: mock(async () => null),
    revert: mock(async () => {}),
    unrevert: mock(async () => {}),
  };
}

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: SID,
    projectID: "project",
    directory: "/repo",
    title: "Session",
    version: "1.0.0",
    time: { created: 1, updated: 2 },
    ...overrides,
  };
}

mock.module("@/store/messages", () => ({ useMessagesStore }));
mock.module("@/store/sessions", () => ({
  useSessionsStore: Object.assign(
    <T,>(selector: (state: SessionsState) => T): T => selector(sessionsState),
    {
      getState: () => sessionsState,
      setState: (update: SessionStoreUpdate) => {
        const patch = typeof update === "function" ? update(sessionsState) : update;
        sessionsState = { ...sessionsState, ...patch };
      },
    },
  ),
}));

const { MessageList } = await import("../MessageList");

function userMessage(id: string, created: number): UserMessage {
  return {
    id,
    sessionID: SID,
    role: "user",
    time: { created },
    agent: "build",
    model: { providerID: "anthropic", modelID: "claude-sonnet" },
  };
}

function assistantMessage(id: string, created: number, completed = created + 100): AssistantMessage {
  return {
    id,
    sessionID: SID,
    role: "assistant",
    time: { created, completed },
    parentID: "msg_user_1",
    modelID: "claude-sonnet",
    providerID: "anthropic",
    mode: "build",
    path: { cwd: "/tmp/project", root: "/tmp/project" },
    cost: 0,
    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
  };
}

function textPart(messageID: string, id: string, text: string): Part {
  return {
    id,
    sessionID: SID,
    messageID,
    type: "text",
    text,
  };
}

function sessionFixture(messageOrder: string[]): SessionFixture {
  const messages = {
    msg_user_1: userMessage("msg_user_1", 100),
    msg_assistant_1: assistantMessage("msg_assistant_1", 200),
    msg_user_2: userMessage("msg_user_2", 300),
  };

  return {
    messageOrder,
    messages,
    parts: {
      msg_user_1: {
        partOrder: ["part_user_1"],
        byId: { part_user_1: textPart("msg_user_1", "part_user_1", "first user message") },
      },
      msg_assistant_1: {
        partOrder: ["part_assistant_1"],
        byId: {
          part_assistant_1: textPart(
            "msg_assistant_1",
            "part_assistant_1",
            "assistant reply",
          ),
        },
      },
      msg_user_2: {
        partOrder: ["part_user_2"],
        byId: { part_user_2: textPart("msg_user_2", "part_user_2", "second user message") },
      },
    },
  };
}

function setSession(data: SessionFixture | undefined, error?: string) {
  useMessagesStore.setState({
    sessions: data ? { [SID]: data } : {},
    loading: {},
    loadError: error ? { [SID]: error } : {},
    streaming: {},
  });
}

function messageListScroller(container: HTMLElement): HTMLDivElement {
  const scroller = container.firstElementChild;
  expect(scroller).toBeInstanceOf(HTMLDivElement);
  return scroller as HTMLDivElement;
}

function defineScrollMetrics(
  element: HTMLDivElement,
  metrics: { scrollHeight: number; clientHeight: number },
) {
  Object.defineProperty(element, "scrollHeight", {
    configurable: true,
    get: () => metrics.scrollHeight,
  });
  Object.defineProperty(element, "clientHeight", {
    configurable: true,
    get: () => metrics.clientHeight,
  });
}

beforeEach(() => {
  messagesState = emptyState();
  sessionsState = emptySessionsState();
  listeners.clear();
});

describe("MessageList", () => {
  it("renders messages in messageOrder", () => {
    setSession(sessionFixture(["msg_user_2", "msg_user_1", "msg_assistant_1"]));

    render(<MessageList sessionID={SID} />);

    const second = screen.getByText("second user message");
    const first = screen.getByText("first user message");
    const assistant = screen.getByText("assistant reply");

    expect(second.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(first.compareDocumentPosition(assistant) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("filters and highlights current-session messages without reordering matches", () => {
    setSession(sessionFixture(["msg_user_2", "msg_user_1", "msg_assistant_1"]));

    render(<MessageList sessionID={SID} searchQuery="user" />);

    const second = screen.getByText("second");
    const first = screen.getByText("first");

    expect(screen.queryByText("assistant reply")).not.toBeInTheDocument();
    expect(second.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByTestId("message-search-highlight")).toHaveLength(2);
  });

  it("shows an empty search result without mutating message order", () => {
    const data = sessionFixture(["msg_user_2", "msg_user_1", "msg_assistant_1"]);
    setSession(data);

    render(<MessageList sessionID={SID} searchQuery="no-match" />);

    expect(screen.getByText("没有匹配的消息")).toBeInTheDocument();
    expect(messagesState.sessions[SID]!.messageOrder).toEqual(["msg_user_2", "msg_user_1", "msg_assistant_1"]);
  });

  it("renders agent and model metadata for user and assistant messages", () => {
    setSession(sessionFixture(["msg_user_1", "msg_assistant_1"]));

    render(<MessageList sessionID={SID} />);

    expect(screen.getByText("you / build / anthropic/claude-sonnet")).toBeInTheDocument();
    expect(screen.getByText("assistant / build / anthropic/claude-sonnet")).toBeInTheDocument();
  });

  it("marks messages after the revert point as muted and shows restore", () => {
    setSession(sessionFixture(["msg_user_1", "msg_assistant_1", "msg_user_2"]));
    sessionsState.sessions = [session({ revert: { messageID: "msg_assistant_1" } })];

    render(<MessageList sessionID={SID} />);

    expect(screen.getByTestId("message-msg_user_2")).toHaveAttribute("data-reverted", "true");
    expect(screen.getByRole("button", { name: "恢复会话" })).toBeInTheDocument();
  });

  it("fork, revert, and unrevert buttons call the sessions store", async () => {
    const user = userEvent.setup();
    setSession(sessionFixture(["msg_user_1", "msg_assistant_1"]));
    sessionsState.sessions = [session({ revert: { messageID: "msg_assistant_1" } })];

    render(<MessageList sessionID={SID} />);

    await user.click(screen.getByRole("button", { name: "分叉消息 msg_user_1" }));
    await user.click(screen.getByRole("button", { name: "回退到消息 msg_user_1" }));
    await user.click(screen.getByRole("button", { name: "恢复会话" }));

    expect(sessionsState.fork).toHaveBeenCalledWith(SID, { messageID: "msg_user_1" });
    expect(sessionsState.revert).toHaveBeenCalledWith(SID, { messageID: "msg_user_1" });
    expect(sessionsState.unrevert).toHaveBeenCalledWith(SID);
  });

  it("resends user messages through the prompt edit path", async () => {
    const user = userEvent.setup();
    setSession(sessionFixture(["msg_user_1"]));

    render(<MessageList sessionID={SID} />);
    await user.click(screen.getByRole("button", { name: "编辑重发消息 msg_user_1" }));

    expect(messagesState.sendPrompt).toHaveBeenCalledWith(SID, "first user message", { messageID: "msg_user_1" });
  });

  it("renders the empty state when the session has no messages", () => {
    setSession({ messageOrder: [], messages: {}, parts: {} });

    render(<MessageList sessionID={SID} />);

    expect(screen.getByText("发送消息开始对话")).toBeInTheDocument();
  });

  it("renders load errors as an alert", () => {
    setSession(undefined, "Unable to load messages");

    render(<MessageList sessionID={SID} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Unable to load messages");
  });

  it("auto-scrolls to the bottom when currently pinned", () => {
    setSession(sessionFixture(["msg_user_1"]));
    const { container } = render(<MessageList sessionID={SID} />);
    const scroller = messageListScroller(container);
    defineScrollMetrics(scroller, { scrollHeight: 600, clientHeight: 300 });
    scroller.scrollTop = 300;

    act(() => {
      useMessagesStore.setState({
        sessions: { [SID]: sessionFixture(["msg_user_1", "msg_assistant_1"]) },
      });
    });

    expect(scroller.scrollTop).toBe(600);
  });

  it("does not auto-scroll when the user is not at the bottom", () => {
    setSession(sessionFixture(["msg_user_1"]));
    const { container } = render(<MessageList sessionID={SID} />);
    const scroller = messageListScroller(container);
    defineScrollMetrics(scroller, { scrollHeight: 600, clientHeight: 300 });
    scroller.scrollTop = 0;
    scroller.dispatchEvent(new Event("scroll"));

    act(() => {
      useMessagesStore.setState({
        sessions: { [SID]: sessionFixture(["msg_user_1", "msg_assistant_1"]) },
      });
    });

    expect(scroller.scrollTop).toBe(0);
  });
});

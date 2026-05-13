import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { Event, Part, UserMessage, AssistantMessage, SessionPromptAsyncData } from "@opencode-ai/sdk/client";
const promptAsyncFn = mock(async (_args: {
  path: { id: string };
  body: NonNullable<SessionPromptAsyncData["body"]>;
}) => ({}));

mock.module("@/lib/opencode", () => ({
  oc: { session: { promptAsync: promptAsyncFn } },
}));

const { useMessagesStore } = await import("../messages");

const SID = "ses_test_1";

function userMessage(id: string, created: number): UserMessage {
  return {
    id,
    sessionID: SID,
    role: "user",
    time: { created },
    agent: "build",
    model: { providerID: "anthropic", modelID: "claude-3-5-sonnet" },
  };
}

function assistantMessage(id: string, created: number, completed?: number): AssistantMessage {
  return {
    id,
    sessionID: SID,
    role: "assistant",
    time: completed !== undefined ? { created, completed } : { created },
    parentID: "msg_user_1",
    modelID: "claude-3-5-sonnet",
    providerID: "anthropic",
    mode: "build",
    path: { cwd: "/tmp", root: "/tmp" },
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

function ev<T extends Event["type"]>(type: T, properties: unknown): Event {
  return { type, properties } as Event;
}

beforeEach(() => {
  promptAsyncFn.mockClear();
  useMessagesStore.setState({
    sessions: {},
    loading: {},
    loadError: {},
    streaming: {},
  });
});

describe("messages.sendPrompt", () => {
  it("sends selected agent and model with trimmed text", async () => {
    await useMessagesStore.getState().sendPrompt(SID, "  hello  ", {
      agent: "build",
      model: { providerID: "anthropic", modelID: "claude-sonnet" },
    });

    expect(promptAsyncFn).toHaveBeenCalledWith({
      path: { id: SID },
      body: {
        agent: "build",
        model: { providerID: "anthropic", modelID: "claude-sonnet" },
        parts: [{ type: "text", text: "hello" }],
      },
    });
  });

  it("sends file parts with optional text", async () => {
    await useMessagesStore.getState().sendPrompt(SID, " see attached ", {
      parts: [
        {
          type: "file",
          mime: "text/plain",
          filename: "note.txt",
          url: "data:text/plain;base64,aGVsbG8=",
        },
      ],
    });

    expect(promptAsyncFn).toHaveBeenCalledWith({
      path: { id: SID },
      body: {
        parts: [
          { type: "text", text: "see attached" },
          {
            type: "file",
            mime: "text/plain",
            filename: "note.txt",
            url: "data:text/plain;base64,aGVsbG8=",
          },
        ],
      },
    });
  });

  it("sends messageID when editing and resending a user message", async () => {
    await useMessagesStore.getState().sendPrompt(SID, "rewritten", { messageID: "msg_user_1" });

    expect(promptAsyncFn).toHaveBeenCalledWith({
      path: { id: SID },
      body: {
        messageID: "msg_user_1",
        parts: [{ type: "text", text: "rewritten" }],
      },
    });
  });
});

describe("messages.applyEvent", () => {
  it("upserts a user message and creates the session bucket", () => {
    const msg = userMessage("msg_u1", 100);
    useMessagesStore.getState().applyEvent(ev("message.updated", { info: msg }));

    const data = useMessagesStore.getState().sessions[SID];
    expect(data).toBeDefined();
    expect(data!.messageOrder).toEqual(["msg_u1"]);
    expect(data!.messages["msg_u1"]).toEqual(msg);
    expect(data!.parts["msg_u1"]).toEqual({ partOrder: [], byId: {} });
  });

  it("orders messages by time.created regardless of arrival order", () => {
    const a = useMessagesStore.getState().applyEvent;
    a(ev("message.updated", { info: userMessage("late", 200) }));
    a(ev("message.updated", { info: userMessage("early", 100) }));
    a(ev("message.updated", { info: userMessage("middle", 150) }));

    expect(useMessagesStore.getState().sessions[SID]!.messageOrder).toEqual([
      "early",
      "middle",
      "late",
    ]);
  });

  it("appends new parts in receive order and replaces existing parts in place", () => {
    const a = useMessagesStore.getState().applyEvent;
    a(ev("message.updated", { info: assistantMessage("m1", 100) }));
    a(ev("message.part.updated", { part: textPart("m1", "p1", "Hel") }));
    a(ev("message.part.updated", { part: textPart("m1", "p1", "Hello") }));
    a(ev("message.part.updated", { part: textPart("m1", "p2", " world") }));

    const bucket = useMessagesStore.getState().sessions[SID]!.parts["m1"]!;
    expect(bucket.partOrder).toEqual(["p1", "p2"]);
    expect((bucket.byId["p1"] as { text: string }).text).toBe("Hello");
    expect((bucket.byId["p2"] as { text: string }).text).toBe(" world");
  });

  it("removes a message and its part bucket on message.removed", () => {
    const a = useMessagesStore.getState().applyEvent;
    a(ev("message.updated", { info: userMessage("m1", 100) }));
    a(ev("message.updated", { info: userMessage("m2", 200) }));
    a(ev("message.removed", { sessionID: SID, messageID: "m1" }));

    const data = useMessagesStore.getState().sessions[SID]!;
    expect(data.messageOrder).toEqual(["m2"]);
    expect(data.messages["m1"]).toBeUndefined();
    expect(data.parts["m1"]).toBeUndefined();
  });

  it("removes a single part on message.part.removed", () => {
    const a = useMessagesStore.getState().applyEvent;
    a(ev("message.updated", { info: assistantMessage("m1", 100) }));
    a(ev("message.part.updated", { part: textPart("m1", "p1", "a") }));
    a(ev("message.part.updated", { part: textPart("m1", "p2", "b") }));
    a(ev("message.part.removed", { sessionID: SID, messageID: "m1", partID: "p1" }));

    const bucket = useMessagesStore.getState().sessions[SID]!.parts["m1"]!;
    expect(bucket.partOrder).toEqual(["p2"]);
    expect(bucket.byId["p1"]).toBeUndefined();
  });

  it("clears streaming when assistant message is completed", () => {
    const store = useMessagesStore.getState();
    store.applyEvent(ev("message.updated", { info: assistantMessage("m1", 100) }));
    useMessagesStore.setState({ streaming: { [SID]: true } });
    store.applyEvent(ev("message.updated", { info: assistantMessage("m1", 100, 200) }));

    expect(useMessagesStore.getState().streaming[SID]).toBe(false);
  });

  it("clears streaming on session.idle", () => {
    useMessagesStore.setState({ streaming: { [SID]: true } });
    useMessagesStore.getState().applyEvent(ev("session.idle", { sessionID: SID }));
    expect(useMessagesStore.getState().streaming[SID]).toBe(false);
  });

  it("ignores session.idle without sessionID", () => {
    useMessagesStore.setState({ streaming: { [SID]: true } });
    useMessagesStore.getState().applyEvent(ev("session.error", {}));
    expect(useMessagesStore.getState().streaming[SID]).toBe(true);
  });

  it("clears the whole session on session.deleted", () => {
    const a = useMessagesStore.getState().applyEvent;
    a(ev("message.updated", { info: userMessage("m1", 100) }));
    a(
      ev("session.deleted", {
        info: {
          id: SID,
          projectID: "global",
          directory: "/",
          title: "x",
          version: "1",
          time: { created: 0, updated: 0 },
        },
      }),
    );

    expect(useMessagesStore.getState().sessions[SID]).toBeUndefined();
  });

  it("does not crash on unknown event types", () => {
    expect(() =>
      useMessagesStore.getState().applyEvent(ev("totally.fake.event" as never, {})),
    ).not.toThrow();
  });
});

import { describe, it, expect, beforeEach } from "bun:test";
import type { Event, Todo } from "@opencode-ai/sdk/client";
import { useTodosStore } from "../todos";

const SID = "ses_todo_1";

function todo(id: string, content: string, status: string, priority = "medium"): Todo {
  return { id, content, status, priority };
}

function ev<T extends Event["type"]>(type: T, properties: unknown): Event {
  return { type, properties } as Event;
}

beforeEach(() => {
  useTodosStore.setState({ bySession: {} });
});

describe("todos store", () => {
  it("stores the latest todo snapshot per session", () => {
    const todos = [todo("t1", "Write tests", "pending"), todo("t2", "Ship M3", "in_progress")];
    useTodosStore.getState().applyEvent(ev("todo.updated", { sessionID: SID, todos }));

    expect(useTodosStore.getState().bySession[SID]).toEqual(todos);
  });

  it("replaces (not merges) the snapshot on each update", () => {
    const a = useTodosStore.getState().applyEvent;
    a(ev("todo.updated", { sessionID: SID, todos: [todo("t1", "old", "pending")] }));
    a(ev("todo.updated", { sessionID: SID, todos: [todo("t2", "new", "completed")] }));

    const list = useTodosStore.getState().bySession[SID];
    expect(list).toHaveLength(1);
    expect(list![0]!.id).toBe("t2");
  });

  it("isolates sessions from each other", () => {
    const a = useTodosStore.getState().applyEvent;
    a(ev("todo.updated", { sessionID: "s1", todos: [todo("t1", "x", "pending")] }));
    a(ev("todo.updated", { sessionID: "s2", todos: [todo("t2", "y", "completed")] }));

    expect(useTodosStore.getState().bySession.s1).toHaveLength(1);
    expect(useTodosStore.getState().bySession.s2).toHaveLength(1);
    expect(useTodosStore.getState().bySession.s1![0]!.id).toBe("t1");
  });

  it("ignores unrelated events", () => {
    useTodosStore
      .getState()
      .applyEvent(ev("session.idle", { sessionID: SID }));
    expect(useTodosStore.getState().bySession).toEqual({});
  });

  it("clear() drops a single session or all when called bare", () => {
    const a = useTodosStore.getState().applyEvent;
    a(ev("todo.updated", { sessionID: "s1", todos: [todo("t1", "x", "pending")] }));
    a(ev("todo.updated", { sessionID: "s2", todos: [todo("t2", "y", "pending")] }));

    useTodosStore.getState().clear("s1");
    expect(useTodosStore.getState().bySession.s1).toBeUndefined();
    expect(useTodosStore.getState().bySession.s2).toHaveLength(1);

    useTodosStore.getState().clear();
    expect(useTodosStore.getState().bySession).toEqual({});
  });
});

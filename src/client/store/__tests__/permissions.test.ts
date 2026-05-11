import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { Event, Permission } from "@opencode-ai/sdk/client";

// Mock the SDK before the store imports it.
const respondFn = mock(async (_args: unknown) => ({ data: true }));

mock.module("@/lib/opencode", () => ({
  oc: { postSessionIdPermissionsPermissionId: respondFn },
}));

const { usePermissionsStore } = await import("../permissions");

const SID = "ses_p_1";

function permission(id: string, opts: Partial<Permission> = {}): Permission {
  return {
    id,
    type: "tool",
    sessionID: SID,
    messageID: "msg_1",
    title: `Allow ${id}?`,
    metadata: {},
    time: { created: 100 },
    ...opts,
  };
}

function ev<T extends Event["type"]>(type: T, properties: unknown): Event {
  return { type, properties } as Event;
}

beforeEach(() => {
  respondFn.mockClear();
  usePermissionsStore.setState({ bySession: {}, pending: {} });
});

describe("permissions.applyEvent", () => {
  it("enqueues a new permission for its session", () => {
    const p = permission("perm_1");
    usePermissionsStore.getState().applyEvent(ev("permission.updated", p));
    expect(usePermissionsStore.getState().bySession[SID]).toEqual([p]);
  });

  it("dedupes by id, replacing the existing entry with the latest payload", () => {
    const a = permission("perm_1", { title: "v1" });
    const b = permission("perm_1", { title: "v2" });
    const apply = usePermissionsStore.getState().applyEvent;
    apply(ev("permission.updated", a));
    apply(ev("permission.updated", b));
    const list = usePermissionsStore.getState().bySession[SID]!;
    expect(list).toHaveLength(1);
    expect(list[0]!.title).toBe("v2");
  });

  it("appends a second distinct permission to the same session queue", () => {
    const apply = usePermissionsStore.getState().applyEvent;
    apply(ev("permission.updated", permission("a")));
    apply(ev("permission.updated", permission("b")));
    const ids = usePermissionsStore.getState().bySession[SID]!.map((p) => p.id);
    expect(ids).toEqual(["a", "b"]);
  });

  it("dequeues on permission.replied", () => {
    const apply = usePermissionsStore.getState().applyEvent;
    apply(ev("permission.updated", permission("a")));
    apply(ev("permission.updated", permission("b")));
    apply(
      ev("permission.replied", { sessionID: SID, permissionID: "a", response: "once" }),
    );
    const list = usePermissionsStore.getState().bySession[SID]!;
    expect(list.map((p) => p.id)).toEqual(["b"]);
  });

  it("ignores replied for unknown sessions without crashing", () => {
    expect(() =>
      usePermissionsStore
        .getState()
        .applyEvent(ev("permission.replied", { sessionID: "ghost", permissionID: "x", response: "reject" })),
    ).not.toThrow();
  });

  it("ignores unrelated event types", () => {
    usePermissionsStore.getState().applyEvent(ev("session.idle", { sessionID: SID }));
    expect(usePermissionsStore.getState().bySession).toEqual({});
  });
});

describe("permissions.reply", () => {
  it("calls the SDK with the right path and response, then optimistically dequeues", async () => {
    const p = permission("perm_1");
    usePermissionsStore.getState().applyEvent(ev("permission.updated", p));

    await usePermissionsStore.getState().reply(p, "once");

    expect(respondFn).toHaveBeenCalledTimes(1);
    expect(respondFn).toHaveBeenCalledWith({
      path: { id: SID, permissionID: "perm_1" },
      body: { response: "once" },
    });
    expect(usePermissionsStore.getState().bySession[SID] ?? []).toEqual([]);
  });

  it("supports the three documented response values", async () => {
    for (const resp of ["once", "always", "reject"] as const) {
      const p = permission(`p-${resp}`);
      usePermissionsStore.getState().applyEvent(ev("permission.updated", p));
      await usePermissionsStore.getState().reply(p, resp);
    }
    const calls = respondFn.mock.calls.map(
      (c) => (c[0] as { body: { response: string } }).body.response,
    );
    expect(calls).toEqual(["once", "always", "reject"]);
  });

  it("re-enqueues at the head when the SDK call fails so the user can retry", async () => {
    respondFn.mockImplementationOnce(async () => {
      throw new Error("network down");
    });
    const a = permission("a");
    const b = permission("b");
    const apply = usePermissionsStore.getState().applyEvent;
    apply(ev("permission.updated", a));
    apply(ev("permission.updated", b));

    await expect(usePermissionsStore.getState().reply(a, "once")).rejects.toThrow(
      "network down",
    );

    const ids = usePermissionsStore.getState().bySession[SID]!.map((p) => p.id);
    expect(ids).toEqual(["a", "b"]);
    expect(usePermissionsStore.getState().pending["a"]).toBeUndefined();
  });
});

describe("permissions selectors", () => {
  it("head() returns the front of the queue or null", () => {
    expect(usePermissionsStore.getState().head(SID)).toBeNull();
    usePermissionsStore.getState().applyEvent(ev("permission.updated", permission("x")));
    expect(usePermissionsStore.getState().head(SID)?.id).toBe("x");
  });

  it("totalCount() sums across sessions", () => {
    const apply = usePermissionsStore.getState().applyEvent;
    apply(ev("permission.updated", permission("a", { sessionID: "s1" })));
    apply(ev("permission.updated", permission("b", { sessionID: "s2" })));
    apply(ev("permission.updated", permission("c", { sessionID: "s2" })));
    expect(usePermissionsStore.getState().totalCount()).toBe(3);
  });

  it("clear() drops a single session or all when bare", () => {
    const apply = usePermissionsStore.getState().applyEvent;
    apply(ev("permission.updated", permission("a", { sessionID: "s1" })));
    apply(ev("permission.updated", permission("b", { sessionID: "s2" })));
    usePermissionsStore.getState().clear("s1");
    expect(usePermissionsStore.getState().bySession.s1).toBeUndefined();
    expect(usePermissionsStore.getState().bySession.s2).toHaveLength(1);
    usePermissionsStore.getState().clear();
    expect(usePermissionsStore.getState().bySession).toEqual({});
  });
});

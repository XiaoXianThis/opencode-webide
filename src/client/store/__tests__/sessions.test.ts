import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { Event, Session } from "@opencode-ai/sdk/client";

const listFn = mock(async () => ({ data: [] as Session[] }));
const createFn = mock(async (_args: { body: { title?: string } }) => ({ data: session("new", 400) }));
const deleteFn = mock(async (_args: { path: { id: string } }) => ({ data: true }));
const updateFn = mock(async (_args: { path: { id: string }; body: { title: string } }) => ({
  data: session("updated", 500, "Updated"),
}));
const forkFn = mock(async (_args: { path: { id: string }; body: { messageID?: string } }) => ({
  data: session("forked", 700, "Forked", { parentID: "root" }),
}));
const revertFn = mock(async (_args: { path: { id: string }; body: { messageID: string; partID?: string } }) => ({
  data: session("target", 700, "Target", { revert: { messageID: "msg_1" } }),
}));
const unrevertFn = mock(async (_args: { path: { id: string } }) => ({
  data: session("target", 800, "Target"),
}));
const shareFn = mock(async (_args: { path: { id: string } }) => ({
  data: session("target", 800, "Target", { share: { url: "https://share.test/ses" } }),
}));
const unshareFn = mock(async (_args: { path: { id: string } }) => ({
  data: session("target", 900, "Target"),
}));
const summarizeFn = mock(async (_args: { path: { id: string }; body: { providerID: string; modelID: string } }) => ({
  data: true,
}));
const childrenFn = mock(async (_args: { path: { id: string } }) => ({
  data: [session("child-b", 100, "Child B"), session("child-a", 300, "Child A")],
}));

mock.module("@/lib/opencode", () => ({
  oc: {
    session: {
      list: listFn,
      create: createFn,
      delete: deleteFn,
      update: updateFn,
      fork: forkFn,
      revert: revertFn,
      unrevert: unrevertFn,
      share: shareFn,
      unshare: unshareFn,
      summarize: summarizeFn,
      children: childrenFn,
    },
  },
}));

const { useSessionsStore } = await import("../sessions");

function session(id: string, updated: number, title = id, overrides: Partial<Session> = {}): Session {
  return {
    id,
    projectID: "project",
    directory: "/repo",
    title,
    version: "1.0.0",
    time: { created: updated - 10, updated },
    ...overrides,
  };
}

function ev<T extends Event["type"]>(type: T, properties: unknown): Event {
  return { type, properties } as Event;
}

beforeEach(() => {
  listFn.mockClear();
  createFn.mockClear();
  deleteFn.mockClear();
  updateFn.mockClear();
  forkFn.mockClear();
  revertFn.mockClear();
  unrevertFn.mockClear();
  shareFn.mockClear();
  unshareFn.mockClear();
  summarizeFn.mockClear();
  childrenFn.mockClear();
  listFn.mockImplementation(async () => ({ data: [] }));
  createFn.mockImplementation(async (_args: { body: { title?: string } }) => ({
    data: session("new", 400),
  }));
  deleteFn.mockImplementation(async (_args: { path: { id: string } }) => ({ data: true }));
  updateFn.mockImplementation(async (_args: { path: { id: string }; body: { title: string } }) => ({
    data: session("updated", 500, "Updated"),
  }));
  forkFn.mockImplementation(async (_args: { path: { id: string }; body: { messageID?: string } }) => ({
    data: session("forked", 700, "Forked", { parentID: "root" }),
  }));
  revertFn.mockImplementation(async (_args: { path: { id: string }; body: { messageID: string; partID?: string } }) => ({
    data: session("target", 700, "Target", { revert: { messageID: "msg_1" } }),
  }));
  unrevertFn.mockImplementation(async (_args: { path: { id: string } }) => ({
    data: session("target", 800, "Target"),
  }));
  shareFn.mockImplementation(async (_args: { path: { id: string } }) => ({
    data: session("target", 800, "Target", { share: { url: "https://share.test/ses" } }),
  }));
  unshareFn.mockImplementation(async (_args: { path: { id: string } }) => ({
    data: session("target", 900, "Target"),
  }));
  summarizeFn.mockImplementation(async (_args: { path: { id: string }; body: { providerID: string; modelID: string } }) => ({
    data: true,
  }));
  childrenFn.mockImplementation(async (_args: { path: { id: string } }) => ({
    data: [session("child-b", 100, "Child B"), session("child-a", 300, "Child A")],
  }));
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: mock(async (_value: string) => {}) },
  });
  useSessionsStore.setState({
    sessions: [],
    childrenByParent: {},
    searchQuery: "",
    activeId: null,
    status: "idle",
    error: null,
  });
});

describe("sessions store", () => {
  it("refresh() sorts sessions by updated time descending", async () => {
    listFn.mockImplementation(async () => ({
      data: [session("old", 100), session("new", 300), session("middle", 200)],
    }));

    await useSessionsStore.getState().refresh();

    expect(useSessionsStore.getState().sessions.map((x) => x.id)).toEqual(["new", "middle", "old"]);
    expect(useSessionsStore.getState().activeId).toBe("new");
    expect(useSessionsStore.getState().status).toBe("ready");
  });

  it("create() prepends the created session and makes it active", async () => {
    const existing = session("existing", 100);
    const created = session("created", 500, "Created");
    createFn.mockImplementation(async (args: { body: { title?: string } }) => ({
      data: { ...created, title: args.body.title ?? created.title },
    }));
    useSessionsStore.setState({ sessions: [existing], activeId: existing.id });

    const result = await useSessionsStore.getState().create("Created from test");

    expect(createFn).toHaveBeenCalledWith({ body: { title: "Created from test" } });
    expect(result).toEqual({ ...created, title: "Created from test" });
    expect(useSessionsStore.getState().sessions.map((x) => x.id)).toEqual(["created", "existing"]);
    expect(useSessionsStore.getState().activeId).toBe("created");
  });

  it("remove() calls the API and removes the session after the response", async () => {
    let resolveDelete: (value: { data: boolean }) => void = () => {};
    deleteFn.mockImplementation(
      async (_args: { path: { id: string } }) =>
        new Promise<{ data: boolean }>((resolve) => {
          resolveDelete = resolve;
        }),
    );
    useSessionsStore.setState({
      sessions: [session("a", 300), session("b", 200)],
      activeId: "a",
    });

    const removing = useSessionsStore.getState().remove("a");

    expect(deleteFn).toHaveBeenCalledWith({ path: { id: "a" } });
    expect(useSessionsStore.getState().sessions.map((x) => x.id)).toEqual(["a", "b"]);

    resolveDelete({ data: true });
    await removing;

    expect(useSessionsStore.getState().sessions.map((x) => x.id)).toEqual(["b"]);
    expect(useSessionsStore.getState().activeId).toBe("b");
  });

  it("remove() falls activeId back to null when deleting the only session", async () => {
    useSessionsStore.setState({ sessions: [session("only", 100)], activeId: "only" });

    await useSessionsStore.getState().remove("only");

    expect(deleteFn).toHaveBeenCalledWith({ path: { id: "only" } });
    expect(useSessionsStore.getState().sessions).toEqual([]);
    expect(useSessionsStore.getState().activeId).toBeNull();
  });

  it("remove() leaves activeId unchanged when deleting an inactive session", async () => {
    useSessionsStore.setState({
      sessions: [session("active", 300), session("inactive", 200)],
      activeId: "active",
    });

    await useSessionsStore.getState().remove("inactive");

    expect(useSessionsStore.getState().sessions.map((x) => x.id)).toEqual(["active"]);
    expect(useSessionsStore.getState().activeId).toBe("active");
  });

  it("rename() calls the API and replaces the matching session", async () => {
    const original = session("target", 100, "Old");
    const replacement = session("target", 600, "New");
    updateFn.mockImplementation(async (_args: { path: { id: string }; body: { title: string } }) => ({
      data: replacement,
    }));
    useSessionsStore.setState({ sessions: [session("other", 200), original], activeId: "target" });

    await useSessionsStore.getState().rename("target", "New");

    expect(updateFn).toHaveBeenCalledWith({ path: { id: "target" }, body: { title: "New" } });
    expect(useSessionsStore.getState().sessions).toEqual([session("other", 200), replacement]);
    expect(useSessionsStore.getState().activeId).toBe("target");
  });

  it("fork() calls the API, stores the child, and makes it active", async () => {
    useSessionsStore.setState({ sessions: [session("root", 100)], activeId: "root" });

    const result = await useSessionsStore.getState().fork("root", { messageID: "msg_1" });

    expect(forkFn).toHaveBeenCalledWith({ path: { id: "root" }, body: { messageID: "msg_1" } });
    expect(result?.id).toBe("forked");
    expect(useSessionsStore.getState().activeId).toBe("forked");
    expect(useSessionsStore.getState().childrenByParent.root.map((x) => x.id)).toEqual(["forked"]);
  });

  it("revert() and unrevert() patch the matching session", async () => {
    useSessionsStore.setState({ sessions: [session("target", 100, "Target")], activeId: "target" });

    await useSessionsStore.getState().revert("target", { messageID: "msg_1", partID: "part_1" });

    expect(revertFn).toHaveBeenCalledWith({ path: { id: "target" }, body: { messageID: "msg_1", partID: "part_1" } });
    expect(useSessionsStore.getState().sessions[0]?.revert).toEqual({ messageID: "msg_1" });

    await useSessionsStore.getState().unrevert("target");

    expect(unrevertFn).toHaveBeenCalledWith({ path: { id: "target" } });
    expect(useSessionsStore.getState().sessions[0]?.revert).toBeUndefined();
  });

  it("share() copies the returned URL and unshare() patches the session", async () => {
    useSessionsStore.setState({ sessions: [session("target", 100, "Target")], activeId: "target" });

    const url = await useSessionsStore.getState().share("target");

    expect(shareFn).toHaveBeenCalledWith({ path: { id: "target" } });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("https://share.test/ses");
    expect(url).toBe("https://share.test/ses");
    expect(useSessionsStore.getState().sessions[0]?.share?.url).toBe("https://share.test/ses");

    await useSessionsStore.getState().unshare("target");

    expect(unshareFn).toHaveBeenCalledWith({ path: { id: "target" } });
    expect(useSessionsStore.getState().sessions[0]?.share).toBeUndefined();
  });

  it("summarize() calls the API and session.updated replaces the title", async () => {
    useSessionsStore.setState({ sessions: [session("target", 100, "Old")], activeId: "target" });

    await useSessionsStore.getState().summarize("target", { providerID: "anthropic", modelID: "claude-sonnet" });
    useSessionsStore.getState().applyEvent(ev("session.updated", { info: session("target", 800, "Summarized") }));

    expect(summarizeFn).toHaveBeenCalledWith({
      path: { id: "target" },
      body: { providerID: "anthropic", modelID: "claude-sonnet" },
    });
    expect(useSessionsStore.getState().sessions[0]?.title).toBe("Summarized");
  });

  it("loadChildren() records sorted children for the parent", async () => {
    const children = await useSessionsStore.getState().loadChildren("root");

    expect(childrenFn).toHaveBeenCalledWith({ path: { id: "root" } });
    expect(children.map((x) => x.id)).toEqual(["child-a", "child-b"]);
    expect(useSessionsStore.getState().childrenByParent.root.map((x) => x.id)).toEqual(["child-a", "child-b"]);
  });

  it("filteredSessions() does case-insensitive title search", () => {
    useSessionsStore.setState({
      sessions: [session("a", 100, "Alpha Task"), session("b", 200, "beta notes")],
      searchQuery: "ALPHA",
    });

    expect(useSessionsStore.getState().filteredSessions().map((x) => x.id)).toEqual(["a"]);
  });
});

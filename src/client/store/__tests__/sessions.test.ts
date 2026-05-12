import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { Session } from "@opencode-ai/sdk/client";

const listFn = mock(async () => ({ data: [] as Session[] }));
const createFn = mock(async (_args: { body: { title?: string } }) => ({ data: session("new", 400) }));
const deleteFn = mock(async (_args: { path: { id: string } }) => ({ data: true }));
const updateFn = mock(async (_args: { path: { id: string }; body: { title: string } }) => ({
  data: session("updated", 500, "Updated"),
}));

mock.module("@/lib/opencode", () => ({
  oc: {
    session: {
      list: listFn,
      create: createFn,
      delete: deleteFn,
      update: updateFn,
    },
  },
}));

const { useSessionsStore } = await import("../sessions");

function session(id: string, updated: number, title = id): Session {
  return {
    id,
    projectID: "project",
    directory: "/repo",
    title,
    version: "1.0.0",
    time: { created: updated - 10, updated },
  };
}

beforeEach(() => {
  listFn.mockClear();
  createFn.mockClear();
  deleteFn.mockClear();
  updateFn.mockClear();
  listFn.mockImplementation(async () => ({ data: [] }));
  createFn.mockImplementation(async (_args: { body: { title?: string } }) => ({
    data: session("new", 400),
  }));
  deleteFn.mockImplementation(async (_args: { path: { id: string } }) => ({ data: true }));
  updateFn.mockImplementation(async (_args: { path: { id: string }; body: { title: string } }) => ({
    data: session("updated", 500, "Updated"),
  }));
  useSessionsStore.setState({
    sessions: [],
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
});

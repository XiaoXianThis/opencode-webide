import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { Event, Pty } from "@opencode-ai/sdk/client";

function pty(id: string, status: Pty["status"] = "running"): Pty {
  return { id, title: `term-${id}`, command: "bash", args: [], cwd: "/repo", status, pid: 100 };
}

const listFn = mock(async () => ({ data: [pty("one")] }));
const createFn = mock(async () => ({ data: pty("two") }));
const removeFn = mock(async () => ({ data: true }));
const connectFn = mock(async () => ({ data: true }));

mock.module("@/lib/opencode", () => ({
  oc: { pty: { list: listFn, create: createFn, remove: removeFn, connect: connectFn } },
}));

const { usePtyStore } = await import("../pty");

beforeEach(() => {
  listFn.mockClear();
  createFn.mockClear();
  removeFn.mockClear();
  connectFn.mockClear();
  usePtyStore.setState({ sessions: [], activeId: null, status: "idle", error: null, exitCodes: {} });
});

describe("pty store", () => {
  it("loads, creates, connects, and removes PTY sessions", async () => {
    await usePtyStore.getState().load();
    expect(usePtyStore.getState().activeId).toBe("one");

    await usePtyStore.getState().create("Terminal");
    expect(createFn).toHaveBeenCalledWith({ body: { title: "Terminal" } });
    expect(usePtyStore.getState().activeId).toBe("two");

    await expect(usePtyStore.getState().connect("two")).resolves.toBe(true);
    expect(connectFn).toHaveBeenCalledWith({ path: { id: "two" } });

    await usePtyStore.getState().remove("two");
    expect(removeFn).toHaveBeenCalledWith({ path: { id: "two" } });
    expect(usePtyStore.getState().activeId).toBe("one");
  });

  it("applies PTY lifecycle events", () => {
    usePtyStore.getState().applyEvent({ type: "pty.created", properties: { info: pty("event") } } as Event);
    expect(usePtyStore.getState().activeId).toBe("event");

    usePtyStore.getState().applyEvent({ type: "pty.exited", properties: { id: "event", exitCode: 7 } } as Event);
    expect(usePtyStore.getState().sessions[0]?.status).toBe("exited");
    expect(usePtyStore.getState().exitCodes.event).toBe(7);

    usePtyStore.getState().applyEvent({ type: "pty.deleted", properties: { id: "event" } } as Event);
    expect(usePtyStore.getState().sessions).toHaveLength(0);
    expect(usePtyStore.getState().exitCodes.event).toBeUndefined();
  });
});

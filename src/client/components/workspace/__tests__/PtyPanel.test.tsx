import { beforeEach, describe, expect, it, mock } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Pty } from "@opencode-ai/sdk/client";
import { usePtyStore } from "@/store/pty";

function pty(id: string): Pty {
  return { id, title: `term-${id}`, command: "bash", args: ["-l"], cwd: "/repo", status: "running", pid: 100 };
}

const listFn = mock(async () => ({ data: [pty("one")] }));
const createFn = mock(async () => ({ data: pty("two") }));
const removeFn = mock(async () => ({ data: true }));

mock.module("@/lib/opencode", () => ({ oc: { pty: { list: listFn, create: createFn, remove: removeFn, connect: mock(async () => ({ data: true })) } } }));

const { PtyPanel } = await import("../PtyPanel");

beforeEach(() => {
  listFn.mockClear();
  createFn.mockClear();
  removeFn.mockClear();
  usePtyStore.setState({ sessions: [], activeId: null, status: "idle", error: null, exitCodes: {} });
});

describe("PtyPanel", () => {
  it("renders loaded sessions and can create a new one", async () => {
    const user = userEvent.setup();
    render(<PtyPanel />);

    await waitFor(() => expect(usePtyStore.getState().activeId).toBe("one"));
    expect(screen.getAllByText("term-one").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "新建" }));
    await waitFor(() => expect(usePtyStore.getState().activeId).toBe("two"));
    expect(screen.getAllByText("term-two").length).toBeGreaterThan(0);
  });
});

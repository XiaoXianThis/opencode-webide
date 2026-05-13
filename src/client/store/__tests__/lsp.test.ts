import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { Event, LspStatus } from "@opencode-ai/sdk/client";

const lspStatus: LspStatus[] = [{ id: "ts", name: "typescript", root: "/repo", status: "connected" }];
const statusFn = mock(async () => ({ data: lspStatus }));

mock.module("@/lib/opencode", () => ({ oc: { lsp: { status: statusFn } } }));

const { useLspStore } = await import("../lsp");

beforeEach(() => {
  statusFn.mockClear();
  statusFn.mockImplementation(async () => ({ data: lspStatus }));
  useLspStore.setState({ clients: [], loading: false, error: null, lastDiagnostics: null });
});

describe("lsp store", () => {
  it("loads client statuses from oc.lsp.status", async () => {
    await useLspStore.getState().load();

    expect(statusFn).toHaveBeenCalledTimes(1);
    expect(useLspStore.getState().clients).toEqual(lspStatus);
    expect(useLspStore.getState().error).toBeNull();
  });

  it("reloads status on lsp.updated", async () => {
    statusFn.mockImplementation(async () => ({
      data: [{ id: "rust", name: "rust-analyzer", root: "/repo", status: "error" }],
    }));

    useLspStore.getState().applyEvent({ type: "lsp.updated", properties: {} } as Event);
    await Promise.resolve();

    expect(useLspStore.getState().clients).toEqual([
      { id: "rust", name: "rust-analyzer", root: "/repo", status: "error" },
    ]);
  });

  it("records diagnostics notices", () => {
    useLspStore.getState().applyEvent({
      type: "lsp.client.diagnostics",
      properties: { serverID: "ts", path: "/repo/src/app.tsx" },
    } as Event);

    expect(useLspStore.getState().lastDiagnostics).toEqual({ serverID: "ts", path: "/repo/src/app.tsx" });
  });
});

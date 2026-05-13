import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { Event } from "@opencode-ai/sdk/client";

const getFn = mock(async () => ({ data: { branch: "main" } }));

mock.module("@/lib/opencode", () => ({ oc: { vcs: { get: getFn } } }));

const { useVcsStore } = await import("../vcs");

beforeEach(() => {
  getFn.mockClear();
  getFn.mockImplementation(async () => ({ data: { branch: "main" } }));
  useVcsStore.setState({ branch: null, error: null });
});

describe("vcs store", () => {
  it("loads initial branch from oc.vcs.get", async () => {
    await useVcsStore.getState().load();
    expect(useVcsStore.getState().branch).toBe("main");
  });

  it("keeps latest vcs.branch.updated event", () => {
    useVcsStore.getState().applyEvent({ type: "vcs.branch.updated", properties: { branch: "feature/a" } } as Event);
    useVcsStore.getState().applyEvent({ type: "vcs.branch.updated", properties: { branch: "feature/b" } } as Event);
    expect(useVcsStore.getState().branch).toBe("feature/b");
  });
});

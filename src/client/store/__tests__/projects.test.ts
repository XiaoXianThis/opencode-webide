import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { Project } from "@opencode-ai/sdk/client";

const projects: Project[] = [
  { id: "b", worktree: "/repo/zeta", time: { created: 2 } },
  { id: "a", worktree: "/repo/alpha", vcs: "git", time: { created: 1, initialized: 1 } },
];
const listFn = mock(async () => ({ data: projects }));
const currentFn = mock(async () => ({ data: projects[1]! }));

mock.module("@/lib/opencode", () => ({ oc: { project: { list: listFn, current: currentFn } } }));

const { useProjectsStore } = await import("../projects");

beforeEach(() => {
  listFn.mockClear();
  currentFn.mockClear();
  listFn.mockImplementation(async () => ({ data: projects }));
  currentFn.mockImplementation(async () => ({ data: projects[1]! }));
  useProjectsStore.setState({ projects: [], activeProjectId: null, status: "idle", error: null });
});

describe("projects store", () => {
  it("loads projects and the current project", async () => {
    await useProjectsStore.getState().load();

    expect(listFn).toHaveBeenCalledTimes(1);
    expect(currentFn).toHaveBeenCalledTimes(1);
    expect(useProjectsStore.getState().projects.map((project) => project.id)).toEqual(["a", "b"]);
    expect(useProjectsStore.getState().activeProjectId).toBe("a");
  });

  it("selects only known projects locally", async () => {
    await useProjectsStore.getState().load();
    useProjectsStore.getState().select("b");
    expect(useProjectsStore.getState().active()?.id).toBe("b");

    useProjectsStore.getState().select("missing");
    expect(useProjectsStore.getState().active()?.id).toBe("b");
  });
});

import { beforeEach, describe, expect, it, mock } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import type { Project } from "@opencode-ai/sdk/client";
import { useProjectsStore } from "@/store/projects";

const projects: Project[] = [
  { id: "one", worktree: "/repo/one", time: { created: 1 } },
  { id: "two", worktree: "/repo/two", time: { created: 2 } },
];
const listFn = mock(async () => ({ data: projects }));
const currentFn = mock(async () => ({ data: projects[0]! }));

mock.module("@/lib/opencode", () => ({ oc: { project: { list: listFn, current: currentFn } } }));

const { ProjectBar } = await import("../ProjectBar");

beforeEach(() => {
  listFn.mockClear();
  currentFn.mockClear();
  useProjectsStore.setState({ projects: [], activeProjectId: null, status: "idle", error: null });
});

describe("ProjectBar", () => {
  it("loads projects and shows the current worktree", async () => {
    render(<ProjectBar />);

    await waitFor(() => expect(useProjectsStore.getState().activeProjectId).toBe("one"));
    expect(screen.getByTestId("project-worktree")).toHaveTextContent("/repo/one");
  });
});

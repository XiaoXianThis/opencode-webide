import { create } from "zustand";
import type { Project } from "@opencode-ai/sdk/client";
import { oc } from "@/lib/opencode";

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface ProjectsState {
  projects: Project[];
  activeProjectId: string | null;
  status: LoadStatus;
  error: string | null;
  load: () => Promise<void>;
  select: (id: string) => void;
  active: () => Project | null;
}

function sortProjects(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => a.worktree.localeCompare(b.worktree));
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  status: "idle",
  error: null,

  load: async () => {
    set({ status: "loading", error: null });
    try {
      const [{ data: projects }, { data: current }] = await Promise.all([oc.project.list(), oc.project.current()]);
      const sorted = sortProjects(projects);
      set({ projects: sorted, activeProjectId: current.id, status: "ready", error: null });
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  },

  select: (id) => {
    if (!get().projects.some((project) => project.id === id)) return;
    set({ activeProjectId: id });
  },

  active: () => get().projects.find((project) => project.id === get().activeProjectId) ?? null,
}));

import { create } from "zustand";
import type { File, FileNode } from "@opencode-ai/sdk/client";
import { oc } from "@/lib/opencode";

type LoadStatus = "idle" | "loading" | "ready" | "error";
type FileStatus = File["status"] | "staged" | "untracked";

interface FilesState {
  nodesByPath: Record<string, FileNode[]>;
  expanded: Set<string>;
  statusByPath: Record<string, FileStatus>;
  loading: Record<string, boolean>;
  status: LoadStatus;
  error: string | null;
  expand: (path: string) => Promise<FileNode[]>;
  collapse: (path: string) => void;
  toggle: (path: string) => Promise<void>;
  refresh: (path: string) => Promise<FileNode[]>;
  refreshStatus: () => Promise<void>;
}

function sortNodes(nodes: FileNode[]): FileNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export const useFilesStore = create<FilesState>((set, get) => ({
  nodesByPath: {},
  expanded: new Set(),
  statusByPath: {},
  loading: {},
  status: "idle",
  error: null,

  expand: async (path) => {
    set((s) => ({ expanded: new Set(s.expanded).add(path) }));
    return get().refresh(path);
  },

  collapse: (path) => {
    set((s) => {
      const expanded = new Set(s.expanded);
      expanded.delete(path);
      return { expanded };
    });
  },

  toggle: async (path) => {
    if (get().expanded.has(path)) get().collapse(path);
    else await get().expand(path);
  },

  refresh: async (path) => {
    set((s) => ({ loading: { ...s.loading, [path]: true }, status: "loading", error: null }));
    try {
      const { data } = await oc.file.list({ query: { path } });
      const sorted = sortNodes(data);
      set((s) => ({ nodesByPath: { ...s.nodesByPath, [path]: sorted }, loading: { ...s.loading, [path]: false }, status: "ready" }));
      return sorted;
    } catch (err) {
      set((s) => ({ loading: { ...s.loading, [path]: false }, status: "error", error: err instanceof Error ? err.message : String(err) }));
      return [];
    }
  },

  refreshStatus: async () => {
    try {
      const { data } = await oc.file.status();
      const statusByPath: Record<string, FileStatus> = {};
      for (const file of data) statusByPath[file.path] = file.status;
      set({ statusByPath });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },
}));

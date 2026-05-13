import { create } from "zustand";
import type { Event, FileContent } from "@opencode-ai/sdk/client";
import { oc } from "@/lib/opencode";

type LoadStatus = "idle" | "loading" | "ready" | "error";

export interface WorkspaceTab {
  id: string;
  path: string;
  name: string;
}

interface WorkspaceState {
  tabs: WorkspaceTab[];
  activeTabId: string | null;
  buffers: Record<string, string>;
  dirty: Set<string>;
  status: LoadStatus;
  error: string | null;
  openFile: (path: string) => Promise<void>;
  closeTab: (id: string) => void;
  switchTab: (id: string) => void;
  edit: (path: string, content: string) => void;
  save: (path: string) => Promise<void>;
  reload: (path: string) => Promise<void>;
  applyEvent: (event: Event) => void;
}

function basename(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
}

function textContent(content: FileContent): string {
  return content.type === "text" ? content.content : "Binary file cannot be displayed.";
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  buffers: {},
  dirty: new Set(),
  status: "idle",
  error: null,

  openFile: async (path) => {
    set((s) => ({
      tabs: s.tabs.some((tab) => tab.id === path) ? s.tabs : [...s.tabs, { id: path, path, name: basename(path) }],
      activeTabId: path,
      status: "loading",
      error: null,
    }));
    if (get().buffers[path] === undefined) await get().reload(path);
    set({ status: "ready" });
  },

  closeTab: (id) => {
    set((s) => {
      const tabs = s.tabs.filter((tab) => tab.id !== id);
      const activeTabId = s.activeTabId === id ? (tabs.at(-1)?.id ?? null) : s.activeTabId;
      return { tabs, activeTabId };
    });
  },

  switchTab: (id) => set({ activeTabId: id }),

  edit: (path, content) => set((s) => ({ buffers: { ...s.buffers, [path]: content }, dirty: new Set(s.dirty).add(path) })),

  save: async (path) => {
    set((s) => {
      const dirty = new Set(s.dirty);
      dirty.delete(path);
      return { dirty };
    });
  },

  reload: async (path) => {
    try {
      const { data } = await oc.file.read({ query: { path } });
      set((s) => ({ buffers: { ...s.buffers, [path]: textContent(data) }, error: null }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), status: "error" });
    }
  },

  applyEvent: (event) => {
    if (event.type !== "file.watcher.updated") return;
    const path = event.properties.file;
    if (get().dirty.has(path) || get().buffers[path] === undefined) return;
    void get().reload(path);
  },
}));

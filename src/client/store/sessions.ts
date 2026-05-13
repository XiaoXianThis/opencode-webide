import { create } from "zustand";
import type { Event, Session } from "@opencode-ai/sdk/client";
import { oc } from "@/lib/opencode";

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface SessionsState {
  sessions: Session[];
  activeId: string | null;
  childrenByParent: Record<string, Session[]>;
  status: LoadStatus;
  error: string | null;
  searchQuery: string;
  refresh: () => Promise<void>;
  create: (title?: string) => Promise<Session | null>;
  fork: (id: string, opts?: { messageID?: string }) => Promise<Session | null>;
  remove: (id: string) => Promise<void>;
  rename: (id: string, title: string) => Promise<void>;
  revert: (id: string, opts: { messageID: string; partID?: string }) => Promise<void>;
  unrevert: (id: string) => Promise<void>;
  share: (id: string) => Promise<string | null>;
  unshare: (id: string) => Promise<void>;
  summarize: (id: string, model: { providerID: string; modelID: string }) => Promise<void>;
  loadChildren: (id: string) => Promise<Session[]>;
  setSearchQuery: (query: string) => void;
  filteredSessions: () => Session[];
  applyEvent: (event: Event) => void;
  setActive: (id: string | null) => void;
}

function sortSessions(list: Session[]): Session[] {
  return [...list].sort((a, b) => (b.time?.updated ?? 0) - (a.time?.updated ?? 0));
}

function upsertSession(list: Session[], session: Session): Session[] {
  return sortSessions([session, ...list.filter((x) => x.id !== session.id)]);
}

function patchSession(list: Session[], session: Session): Session[] {
  return list.map((x) => (x.id === session.id ? session : x));
}

export const useSessionsStore = create<SessionsState>((set, get) => ({
  sessions: [],
  activeId: null,
  childrenByParent: {},
  status: "idle",
  error: null,
  searchQuery: "",

  refresh: async () => {
    set({ status: "loading", error: null });
    try {
      const { data: list } = await oc.session.list();
      const sorted = sortSessions(list);
      const activeId = get().activeId ?? sorted[0]?.id ?? null;
      set({ sessions: sorted, status: "ready", activeId });
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  },

  create: async (title) => {
    try {
      const { data: session } = await oc.session.create({ body: title ? { title } : {} });
      set((s) => ({ sessions: [session, ...s.sessions.filter((x) => x.id !== session.id)], activeId: session.id }));
      return session;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  },

  fork: async (id, opts) => {
    try {
      const { data: session } = await oc.session.fork({ path: { id }, body: opts?.messageID ? { messageID: opts.messageID } : {} });
      set((s) => ({ sessions: upsertSession(s.sessions, session), childrenByParent: session.parentID ? { ...s.childrenByParent, [session.parentID]: upsertSession(s.childrenByParent[session.parentID] ?? [], session) } : s.childrenByParent, activeId: session.id }));
      return session;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  },

  remove: async (id) => {
    try {
      await oc.session.delete({ path: { id } });
      set((s) => {
        const sessions = s.sessions.filter((x) => x.id !== id);
        const activeId = s.activeId === id ? (sessions[0]?.id ?? null) : s.activeId;
        const childrenByParent = { ...s.childrenByParent };
        delete childrenByParent[id];
        for (const [parentID, children] of Object.entries(childrenByParent)) {
          childrenByParent[parentID] = children.filter((x) => x.id !== id);
        }
        return { sessions, activeId, childrenByParent };
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  rename: async (id, title) => {
    try {
      const { data: updated } = await oc.session.update({ path: { id }, body: { title } });
      set((s) => ({ sessions: patchSession(s.sessions, updated) }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  revert: async (id, opts) => {
    try {
      const { data: updated } = await oc.session.revert({ path: { id }, body: opts });
      set((s) => ({ sessions: patchSession(s.sessions, updated) }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  unrevert: async (id) => {
    try {
      const { data: updated } = await oc.session.unrevert({ path: { id } });
      set((s) => ({ sessions: patchSession(s.sessions, updated) }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  share: async (id) => {
    try {
      const { data: updated } = await oc.session.share({ path: { id } });
      set((s) => ({ sessions: patchSession(s.sessions, updated) }));
      const url = updated.share?.url ?? null;
      if (url && typeof navigator !== "undefined" && navigator.clipboard) await navigator.clipboard.writeText(url);
      return url;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  },

  unshare: async (id) => {
    try {
      const { data: updated } = await oc.session.unshare({ path: { id } });
      set((s) => ({ sessions: patchSession(s.sessions, updated) }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  summarize: async (id, model) => {
    try {
      await oc.session.summarize({ path: { id }, body: model });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  loadChildren: async (id) => {
    try {
      const { data } = await oc.session.children({ path: { id } });
      const sorted = sortSessions(data);
      set((s) => ({ childrenByParent: { ...s.childrenByParent, [id]: sorted } }));
      return sorted;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      return [];
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  filteredSessions: () => {
    const query = get().searchQuery.trim().toLowerCase();
    if (!query) return get().sessions;
    return get().sessions.filter((s) => (s.title || s.id).toLowerCase().includes(query));
  },

  applyEvent: (event) => {
    if (event.type === "session.created" || event.type === "session.updated") {
      const session = event.properties.info;
      set((s) => ({ sessions: upsertSession(s.sessions, session) }));
    }
    if (event.type === "session.deleted") {
      const id = event.properties.info.id;
      set((s) => {
        const sessions = s.sessions.filter((x) => x.id !== id);
        return { sessions, activeId: s.activeId === id ? (sessions[0]?.id ?? null) : s.activeId };
      });
    }
  },

  setActive: (id) => set({ activeId: id }),
}));

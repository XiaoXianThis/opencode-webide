import { create } from "zustand";
import type { Session } from "@opencode-ai/sdk/client";
import { oc } from "@/lib/opencode";

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface SessionsState {
  sessions: Session[];
  activeId: string | null;
  status: LoadStatus;
  error: string | null;

  refresh: () => Promise<void>;
  create: (title?: string) => Promise<Session | null>;
  remove: (id: string) => Promise<void>;
  rename: (id: string, title: string) => Promise<void>;
  setActive: (id: string | null) => void;
}

export const useSessionsStore = create<SessionsState>((set, get) => ({
  sessions: [],
  activeId: null,
  status: "idle",
  error: null,

  refresh: async () => {
    set({ status: "loading", error: null });
    try {
      const { data: list } = await oc.session.list();
      const sorted = [...list].sort(
        (a, b) => (b.time?.updated ?? 0) - (a.time?.updated ?? 0),
      );
      const activeId = get().activeId ?? sorted[0]?.id ?? null;
      set({ sessions: sorted, status: "ready", activeId });
    } catch (err) {
      set({
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  create: async (title) => {
    try {
      const { data: session } = await oc.session.create({ body: title ? { title } : {} });
      set((s) => ({
        sessions: [session, ...s.sessions.filter((x) => x.id !== session.id)],
        activeId: session.id,
      }));
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
        return { sessions, activeId };
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  rename: async (id, title) => {
    try {
      const { data: updated } = await oc.session.update({ path: { id }, body: { title } });
      set((s) => ({
        sessions: s.sessions.map((x) => (x.id === id ? updated : x)),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  setActive: (id) => set({ activeId: id }),
}));

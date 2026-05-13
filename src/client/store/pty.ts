import { create } from "zustand";
import type { Event, Pty } from "@opencode-ai/sdk/client";
import { oc } from "@/lib/opencode";

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface PtyState {
  sessions: Pty[];
  activeId: string | null;
  status: LoadStatus;
  error: string | null;
  exitCodes: Record<string, number>;
  load: () => Promise<void>;
  create: (title?: string) => Promise<Pty | null>;
  remove: (id: string) => Promise<void>;
  connect: (id: string) => Promise<boolean>;
  select: (id: string | null) => void;
  applyEvent: (event: Event) => void;
}

function upsert(list: Pty[], pty: Pty): Pty[] {
  return [pty, ...list.filter((item) => item.id !== pty.id)];
}

export const usePtyStore = create<PtyState>((set, get) => ({
  sessions: [],
  activeId: null,
  status: "idle",
  error: null,
  exitCodes: {},

  load: async () => {
    set({ status: "loading", error: null });
    try {
      const { data } = await oc.pty.list();
      set({ sessions: data, activeId: get().activeId ?? data[0]?.id ?? null, status: "ready" });
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  },

  create: async (title = "WebIDE Terminal") => {
    try {
      const { data } = await oc.pty.create({ body: { title } });
      set((s) => ({ sessions: upsert(s.sessions, data), activeId: data.id, status: "ready", error: null }));
      return data;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  },

  remove: async (id) => {
    await oc.pty.remove({ path: { id } });
    set((s) => {
      const sessions = s.sessions.filter((session) => session.id !== id);
      const exitCodes = { ...s.exitCodes };
      delete exitCodes[id];
      return { sessions, activeId: s.activeId === id ? (sessions[0]?.id ?? null) : s.activeId, exitCodes };
    });
  },

  connect: async (id) => {
    const { data } = await oc.pty.connect({ path: { id } });
    return data;
  },

  select: (id) => set({ activeId: id }),

  applyEvent: (event) => {
    if (event.type === "pty.created" || event.type === "pty.updated") {
      set((s) => ({ sessions: upsert(s.sessions, event.properties.info), activeId: s.activeId ?? event.properties.info.id }));
      return;
    }
    if (event.type === "pty.exited") {
      set((s) => ({
        sessions: s.sessions.map((session) => (session.id === event.properties.id ? { ...session, status: "exited" } : session)),
        exitCodes: { ...s.exitCodes, [event.properties.id]: event.properties.exitCode },
      }));
      return;
    }
    if (event.type === "pty.deleted") {
      set((s) => {
        const sessions = s.sessions.filter((session) => session.id !== event.properties.id);
        const exitCodes = { ...s.exitCodes };
        delete exitCodes[event.properties.id];
        return { sessions, activeId: s.activeId === event.properties.id ? (sessions[0]?.id ?? null) : s.activeId, exitCodes };
      });
    }
  },
}));

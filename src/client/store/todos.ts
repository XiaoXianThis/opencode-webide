import { create } from "zustand";
import type { Event, Todo } from "@opencode-ai/sdk/client";

interface TodosState {
  /** Latest todo snapshot per session, mirrored from `todo.updated` events. */
  bySession: Record<string, Todo[]>;
  applyEvent: (event: Event) => void;
  clear: (sessionID?: string) => void;
}

export const useTodosStore = create<TodosState>((set) => ({
  bySession: {},

  applyEvent: (event) => {
    if (event.type !== "todo.updated") return;
    const { sessionID, todos } = event.properties;
    set((s) => ({ bySession: { ...s.bySession, [sessionID]: todos } }));
  },

  clear: (sessionID) => {
    set((s) => {
      if (!sessionID) return { bySession: {} };
      const next = { ...s.bySession };
      delete next[sessionID];
      return { bySession: next };
    });
  },
}));

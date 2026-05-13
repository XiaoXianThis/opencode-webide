import { create } from "zustand";
import type { Event } from "@opencode-ai/sdk/client";
import { oc } from "@/lib/opencode";

interface VcsState {
  branch: string | null;
  load: () => Promise<void>;
  applyEvent: (event: Event) => void;
}

export const useVcsStore = create<VcsState>((set) => ({
  branch: null,
  load: async () => {
    try {
      const { data } = await oc.vcs.get();
      set({ branch: data.branch });
    } catch {
      set({ branch: null });
    }
  },
  applyEvent: (event) => {
    if (event.type === "vcs.branch.updated") set({ branch: event.properties.branch ?? null });
  },
}));

import { create } from "zustand";
import type { Event, LspStatus } from "@opencode-ai/sdk/client";
import { oc } from "@/lib/opencode";

interface LspDiagnosticsNotice {
  serverID: string;
  path: string;
}

interface LspState {
  clients: LspStatus[];
  loading: boolean;
  error: string | null;
  lastDiagnostics: LspDiagnosticsNotice | null;
  load: () => Promise<void>;
  applyEvent: (event: Event) => void;
}

export const useLspStore = create<LspState>((set, get) => ({
  clients: [],
  loading: false,
  error: null,
  lastDiagnostics: null,
  load: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await oc.lsp.status();
      set({ clients: data, loading: false, error: null });
    } catch (err) {
      set({ clients: [], loading: false, error: err instanceof Error ? err.message : String(err) });
    }
  },
  applyEvent: (event) => {
    if (event.type === "lsp.updated") {
      void get().load();
      return;
    }
    if (event.type === "lsp.client.diagnostics") {
      set({ lastDiagnostics: event.properties });
    }
  },
}));

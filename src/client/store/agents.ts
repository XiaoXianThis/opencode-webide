import { create } from "zustand";
import type { Agent } from "@opencode-ai/sdk/client";
import { oc } from "@/lib/opencode";

type LoadStatus = "idle" | "loading" | "ready" | "error";

export interface AgentOption {
  id: string;
  name: string;
  description?: string;
  mode: Agent["mode"];
  builtIn: boolean;
  model?: Agent["model"];
}

interface AgentsState {
  options: AgentOption[];
  selectedAgent: string | null;
  status: LoadStatus;
  error: string | null;

  load: () => Promise<void>;
  select: (agent: string) => void;
  current: () => AgentOption | null;
}

const STORAGE_KEY = "webide.selectedAgent";

function readPersisted(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw || null;
  } catch {
    return null;
  }
}

function writePersisted(value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore quota / privacy mode
  }
}

export function buildAgentOptions(agents: Agent[]): AgentOption[] {
  return agents
    .filter((agent) => agent.mode === "primary" || agent.mode === "all")
    .map((agent) => ({
      id: agent.name,
      name: agent.name,
      description: agent.description,
      mode: agent.mode,
      builtIn: agent.builtIn,
      model: agent.model,
    }))
    .sort((a, b) => {
      if (a.builtIn !== b.builtIn) return a.builtIn ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

function pickInitialSelection(options: AgentOption[], persisted: string | null): string | null {
  if (persisted && options.some((option) => option.id === persisted)) return persisted;
  return options[0]?.id ?? null;
}

export const useAgentsStore = create<AgentsState>((set, get) => ({
  options: [],
  selectedAgent: null,
  status: "idle",
  error: null,

  load: async () => {
    set({ status: "loading", error: null });
    try {
      const { data } = await oc.app.agents();
      const options = buildAgentOptions(data);
      const selectedAgent = pickInitialSelection(options, readPersisted());
      set({ options, selectedAgent, status: "ready" });
    } catch (err) {
      set({
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  select: (agent) => {
    const exists = get().options.some((option) => option.id === agent);
    if (!exists) return;
    set({ selectedAgent: agent });
    writePersisted(agent);
  },

  current: () => {
    const { options, selectedAgent } = get();
    return options.find((option) => option.id === selectedAgent) ?? null;
  },
}));

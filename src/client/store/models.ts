import { create } from "zustand";
import type { Provider, Model } from "@opencode-ai/sdk/client";
import { oc } from "@/lib/opencode";

export interface ModelOption {
  providerID: string;
  providerName: string;
  modelID: string;
  modelName: string;
  status: Model["status"];
  contextLimit: number;
  outputLimit: number;
  costInput: number;
  costOutput: number;
  isDefault: boolean;
}

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface ModelsState {
  providers: Provider[];
  defaults: Record<string, string>;
  options: ModelOption[];
  selectedProviderID: string | null;
  selectedModelID: string | null;
  status: LoadStatus;
  error: string | null;

  load: () => Promise<void>;
  select: (providerID: string, modelID: string) => void;
  /** Returns the currently selected option, or null when nothing is loaded. */
  current: () => ModelOption | null;
}

const STORAGE_KEY = "webide.selectedModel";

interface Persisted {
  providerID: string;
  modelID: string;
}

function readPersisted(): Persisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    if (typeof parsed.providerID === "string" && typeof parsed.modelID === "string") {
      return { providerID: parsed.providerID, modelID: parsed.modelID };
    }
    return null;
  } catch {
    return null;
  }
}

function writePersisted(value: Persisted | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore quota / privacy mode
  }
}

export function buildOptions(
  providers: Provider[],
  defaults: Record<string, string>,
): ModelOption[] {
  const out: ModelOption[] = [];
  for (const provider of providers) {
    const defaultModelID = defaults[provider.id];
    for (const model of Object.values(provider.models)) {
      out.push({
        providerID: provider.id,
        providerName: provider.name,
        modelID: model.id,
        modelName: model.name,
        status: model.status,
        contextLimit: model.limit.context,
        outputLimit: model.limit.output,
        costInput: model.cost.input,
        costOutput: model.cost.output,
        isDefault: model.id === defaultModelID,
      });
    }
  }
  // Sort: default first, then by provider name, then by model name. Hide
  // deprecated unless they are the only option for a provider.
  out.sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    if (a.providerName !== b.providerName) {
      return a.providerName.localeCompare(b.providerName);
    }
    return a.modelName.localeCompare(b.modelName);
  });
  return out;
}

function pickInitialSelection(
  options: ModelOption[],
  defaults: Record<string, string>,
  persisted: Persisted | null,
): { providerID: string; modelID: string } | null {
  if (persisted) {
    const hit = options.find(
      (o) => o.providerID === persisted.providerID && o.modelID === persisted.modelID,
    );
    if (hit) return persisted;
  }
  const defaultEntry = Object.entries(defaults)[0];
  if (defaultEntry) {
    const [providerID, modelID] = defaultEntry;
    if (options.some((o) => o.providerID === providerID && o.modelID === modelID)) {
      return { providerID, modelID };
    }
  }
  const first = options[0];
  return first ? { providerID: first.providerID, modelID: first.modelID } : null;
}

export const useModelsStore = create<ModelsState>((set, get) => ({
  providers: [],
  defaults: {},
  options: [],
  selectedProviderID: null,
  selectedModelID: null,
  status: "idle",
  error: null,

  load: async () => {
    set({ status: "loading", error: null });
    try {
      const { data } = await oc.config.providers();
      const providers = data.providers;
      const defaults = data.default;
      const options = buildOptions(providers, defaults);
      const persisted = readPersisted();
      const pick = pickInitialSelection(options, defaults, persisted);
      set({
        providers,
        defaults,
        options,
        selectedProviderID: pick?.providerID ?? null,
        selectedModelID: pick?.modelID ?? null,
        status: "ready",
      });
    } catch (err) {
      set({
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  select: (providerID, modelID) => {
    const exists = get().options.some(
      (o) => o.providerID === providerID && o.modelID === modelID,
    );
    if (!exists) return;
    set({ selectedProviderID: providerID, selectedModelID: modelID });
    writePersisted({ providerID, modelID });
  },

  current: () => {
    const { options, selectedProviderID, selectedModelID } = get();
    if (!selectedProviderID || !selectedModelID) return null;
    return (
      options.find(
        (o) => o.providerID === selectedProviderID && o.modelID === selectedModelID,
      ) ?? null
    );
  },
}));

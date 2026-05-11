import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { Provider } from "@opencode-ai/sdk/client";

// Inject a stub for @/lib/opencode before importing the store under test.
const providersFn = mock(async () => ({
  data: { providers: [] as Provider[], default: {} as Record<string, string> },
}));

mock.module("@/lib/opencode", () => ({
  oc: { config: { providers: providersFn } },
}));

const { useModelsStore, buildOptions } = await import("../models");

const STORAGE_KEY = "webide.selectedModel";

function makeProvider(
  id: string,
  name: string,
  models: Array<{ id: string; name: string; status?: "active" | "alpha" | "beta" | "deprecated" }>,
): Provider {
  return {
    id,
    name,
    source: "config",
    env: [],
    options: {},
    models: Object.fromEntries(
      models.map((m) => [
        m.id,
        {
          id: m.id,
          providerID: id,
          api: { id: m.id, url: "", npm: "" },
          name: m.name,
          capabilities: {
            temperature: true,
            reasoning: false,
            attachment: false,
            toolcall: true,
            input: { text: true, audio: false, image: false, video: false, pdf: false },
            output: { text: true, audio: false, image: false, video: false, pdf: false },
          },
          cost: {
            input: 1,
            output: 2,
            cache: { read: 0, write: 0 },
          },
          limit: { context: 200_000, output: 8000 },
          status: m.status ?? "active",
          options: {},
          headers: {},
        },
      ]),
    ),
  };
}

beforeEach(() => {
  providersFn.mockClear();
  window.localStorage.clear();
  useModelsStore.setState({
    providers: [],
    defaults: {},
    options: [],
    selectedProviderID: null,
    selectedModelID: null,
    status: "idle",
    error: null,
  });
});

describe("buildOptions", () => {
  it("flattens providers and marks defaults first", () => {
    const providers = [
      makeProvider("anthropic", "Anthropic", [
        { id: "claude-haiku", name: "Claude Haiku" },
        { id: "claude-sonnet", name: "Claude Sonnet" },
      ]),
      makeProvider("openai", "OpenAI", [{ id: "gpt-5", name: "GPT-5" }]),
    ];
    const defaults = { anthropic: "claude-sonnet" };

    const out = buildOptions(providers, defaults);

    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({
      providerID: "anthropic",
      modelID: "claude-sonnet",
      isDefault: true,
    });
    // Non-default entries should be alpha-sorted by provider name then model name
    expect(out.slice(1).map((o) => `${o.providerName}/${o.modelName}`)).toEqual([
      "Anthropic/Claude Haiku",
      "OpenAI/GPT-5",
    ]);
  });
});

describe("models store", () => {
  it("load() populates options and picks the configured default", async () => {
    providersFn.mockImplementationOnce(async () => ({
      data: {
        providers: [
          makeProvider("anthropic", "Anthropic", [
            { id: "claude-haiku", name: "Claude Haiku" },
            { id: "claude-sonnet", name: "Claude Sonnet" },
          ]),
        ],
        default: { anthropic: "claude-sonnet" },
      },
    }));

    await useModelsStore.getState().load();

    const s = useModelsStore.getState();
    expect(s.status).toBe("ready");
    expect(s.options).toHaveLength(2);
    expect(s.selectedProviderID).toBe("anthropic");
    expect(s.selectedModelID).toBe("claude-sonnet");
  });

  it("load() honours persisted selection when it still exists", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ providerID: "anthropic", modelID: "claude-haiku" }),
    );
    providersFn.mockImplementationOnce(async () => ({
      data: {
        providers: [
          makeProvider("anthropic", "Anthropic", [
            { id: "claude-haiku", name: "Claude Haiku" },
            { id: "claude-sonnet", name: "Claude Sonnet" },
          ]),
        ],
        default: { anthropic: "claude-sonnet" },
      },
    }));

    await useModelsStore.getState().load();

    const s = useModelsStore.getState();
    expect(s.selectedModelID).toBe("claude-haiku");
  });

  it("load() falls back to default when persisted selection is no longer available", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ providerID: "ghost", modelID: "vapor-1" }),
    );
    providersFn.mockImplementationOnce(async () => ({
      data: {
        providers: [makeProvider("openai", "OpenAI", [{ id: "gpt-5", name: "GPT-5" }])],
        default: { openai: "gpt-5" },
      },
    }));

    await useModelsStore.getState().load();

    const s = useModelsStore.getState();
    expect(s.selectedProviderID).toBe("openai");
    expect(s.selectedModelID).toBe("gpt-5");
  });

  it("load() records error state when SDK throws", async () => {
    providersFn.mockImplementationOnce(async () => {
      throw new Error("kaboom");
    });
    await useModelsStore.getState().load();
    expect(useModelsStore.getState().status).toBe("error");
    expect(useModelsStore.getState().error).toBe("kaboom");
  });

  it("select() persists to localStorage and updates state", async () => {
    providersFn.mockImplementationOnce(async () => ({
      data: {
        providers: [
          makeProvider("anthropic", "Anthropic", [
            { id: "claude-haiku", name: "Claude Haiku" },
            { id: "claude-sonnet", name: "Claude Sonnet" },
          ]),
        ],
        default: { anthropic: "claude-sonnet" },
      },
    }));
    await useModelsStore.getState().load();

    useModelsStore.getState().select("anthropic", "claude-haiku");

    expect(useModelsStore.getState().selectedModelID).toBe("claude-haiku");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(
      JSON.stringify({ providerID: "anthropic", modelID: "claude-haiku" }),
    );
  });

  it("select() ignores unknown options", async () => {
    providersFn.mockImplementationOnce(async () => ({
      data: {
        providers: [
          makeProvider("anthropic", "Anthropic", [{ id: "claude-haiku", name: "Claude Haiku" }]),
        ],
        default: { anthropic: "claude-haiku" },
      },
    }));
    await useModelsStore.getState().load();

    useModelsStore.getState().select("anthropic", "nope");

    expect(useModelsStore.getState().selectedModelID).toBe("claude-haiku");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("current() returns the selected option or null", async () => {
    expect(useModelsStore.getState().current()).toBeNull();

    providersFn.mockImplementationOnce(async () => ({
      data: {
        providers: [
          makeProvider("anthropic", "Anthropic", [{ id: "claude-haiku", name: "Claude Haiku" }]),
        ],
        default: { anthropic: "claude-haiku" },
      },
    }));
    await useModelsStore.getState().load();

    const cur = useModelsStore.getState().current();
    expect(cur?.modelID).toBe("claude-haiku");
  });
});

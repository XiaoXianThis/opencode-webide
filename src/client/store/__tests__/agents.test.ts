import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { Agent } from "@opencode-ai/sdk/client";

const agentsFn = mock(async () => ({ data: [] as Agent[] }));

mock.module("@/lib/opencode", () => ({
  oc: { app: { agents: agentsFn } },
}));

const { buildAgentOptions, useAgentsStore } = await import("../agents");

const STORAGE_KEY = "webide.selectedAgent";

function agent(overrides: Partial<Agent> & { name: string }): Agent {
  return {
    name: overrides.name,
    description: overrides.description,
    mode: overrides.mode ?? "primary",
    builtIn: overrides.builtIn ?? false,
    permission: {
      edit: "ask",
      bash: {},
    },
    tools: {},
    options: {},
    model: overrides.model,
  };
}

beforeEach(() => {
  agentsFn.mockClear();
  window.localStorage.clear();
  useAgentsStore.setState({
    options: [],
    selectedAgent: null,
    status: "idle",
    error: null,
  });
});

describe("buildAgentOptions", () => {
  it("keeps primary/all agents and sorts built-ins first", () => {
    const options = buildAgentOptions([
      agent({ name: "zeta", mode: "subagent", builtIn: true }),
      agent({ name: "custom", mode: "primary", builtIn: false }),
      agent({ name: "build", mode: "all", builtIn: true }),
    ]);

    expect(options.map((option) => option.id)).toEqual(["build", "custom"]);
  });
});

describe("agents store", () => {
  it("load() uses oc.app.agents and selects the first available agent", async () => {
    agentsFn.mockImplementationOnce(async () => ({
      data: [agent({ name: "build" }), agent({ name: "plan", builtIn: false })],
    }));

    await useAgentsStore.getState().load();

    expect(agentsFn).toHaveBeenCalledTimes(1);
    expect(useAgentsStore.getState().status).toBe("ready");
    expect(useAgentsStore.getState().selectedAgent).toBe("build");
  });

  it("load() restores a persisted selected agent", async () => {
    window.localStorage.setItem(STORAGE_KEY, "plan");
    agentsFn.mockImplementationOnce(async () => ({
      data: [agent({ name: "build" }), agent({ name: "plan", builtIn: false })],
    }));

    await useAgentsStore.getState().load();

    expect(useAgentsStore.getState().selectedAgent).toBe("plan");
  });

  it("select() persists known agents and ignores unknown ones", async () => {
    agentsFn.mockImplementationOnce(async () => ({
      data: [agent({ name: "build" }), agent({ name: "plan", builtIn: false })],
    }));
    await useAgentsStore.getState().load();

    useAgentsStore.getState().select("plan");
    useAgentsStore.getState().select("missing");

    expect(useAgentsStore.getState().selectedAgent).toBe("plan");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("plan");
  });

  it("current() returns the selected option", async () => {
    agentsFn.mockImplementationOnce(async () => ({ data: [agent({ name: "build" })] }));
    await useAgentsStore.getState().load();

    expect(useAgentsStore.getState().current()?.id).toBe("build");
  });
});

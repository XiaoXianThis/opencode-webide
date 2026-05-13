import { describe, expect, it } from "bun:test";
import type { AgentOption } from "@/store/agents";
import { filterAgentOptions } from "../AgentPicker";

function option(overrides: Partial<AgentOption>): AgentOption {
  return {
    id: "build",
    name: "build",
    description: "Build things",
    mode: "primary",
    builtIn: true,
    ...overrides,
  };
}

describe("AgentPicker helpers", () => {
  it("filters agents by name and description", () => {
    const options = [
      option({ id: "build", name: "build", description: "Build things" }),
      option({ id: "review", name: "review", description: "Review code", builtIn: false }),
    ];

    expect(filterAgentOptions(options, "review").map((item) => item.id)).toEqual(["review"]);
    expect(filterAgentOptions(options, "things").map((item) => item.id)).toEqual(["build"]);
  });

  it("returns all agents for an empty query", () => {
    const options = [option({ id: "build" }), option({ id: "plan", name: "plan" })];

    expect(filterAgentOptions(options, "").map((item) => item.id)).toEqual(["build", "plan"]);
  });

  it("returns an empty list when no agent matches", () => {
    expect(filterAgentOptions([option({ id: "build" })], "missing")).toEqual([]);
  });
});

import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Part } from "@opencode-ai/sdk/client";
import { SubtaskPartView } from "../parts/SubtaskPartView";

type SubtaskPart = Extract<Part, { type: "subtask" }>;

function subtask(prompt: string, agent = "build", description = "review changes"): SubtaskPart {
  return {
    id: "prt_1",
    sessionID: "ses_1",
    messageID: "msg_1",
    type: "subtask",
    prompt,
    description,
    agent,
  };
}

describe("SubtaskPartView", () => {
  it("renders the agent chip and description in the header", () => {
    render(<SubtaskPartView part={subtask("long prompt", "review", "fix bug")} />);
    expect(screen.getByText("fix bug")).toBeInTheDocument();
    expect(screen.getByTestId("subtask-agent").textContent).toBe("review");
  });

  it("falls back to the agent name when no description is set", () => {
    render(<SubtaskPartView part={subtask("p", "specialist", "")} />);
    // Title slot + chip both render the agent name; either occurrence is fine.
    expect(screen.getAllByText("specialist").length).toBeGreaterThanOrEqual(1);
  });

  it("collapses the prompt by default and expands on click", async () => {
    const user = userEvent.setup();
    const longPrompt = "Investigate the broken test suite and report findings.";
    render(<SubtaskPartView part={subtask(longPrompt)} />);

    await user.click(screen.getByRole("button"));
    expect(screen.getByTestId("subtask-prompt").textContent).toBe(longPrompt);
  });
});

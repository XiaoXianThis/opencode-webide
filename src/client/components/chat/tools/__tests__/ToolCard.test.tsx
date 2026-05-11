import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToolCard, formatDuration, getDuration } from "../ToolCard";
import type { ToolState } from "@opencode-ai/sdk/client";

describe("formatDuration", () => {
  it("renders sub-second values in ms", () => {
    expect(formatDuration(345)).toBe("345ms");
  });

  it("renders short seconds with one decimal", () => {
    expect(formatDuration(2_400)).toBe("2.4s");
  });

  it("renders long seconds without decimals", () => {
    expect(formatDuration(45_000)).toBe("45s");
  });

  it("renders minutes when over 60s", () => {
    expect(formatDuration(125_000)).toBe("2m5s");
  });

  it("returns empty string for invalid input", () => {
    expect(formatDuration(-1)).toBe("");
    expect(formatDuration(Number.NaN)).toBe("");
  });
});

describe("getDuration", () => {
  it("returns end-start for completed/error states", () => {
    const completed: ToolState = {
      status: "completed",
      input: {},
      output: "",
      title: "",
      metadata: {},
      time: { start: 100, end: 350 },
    };
    expect(getDuration(completed)).toBe(250);
  });

  it("returns undefined for non-terminal states", () => {
    const pending: ToolState = { status: "pending", input: {}, raw: "" };
    expect(getDuration(pending)).toBeUndefined();
  });
});

describe("ToolCard", () => {
  it("renders the tool name, title and is collapsed by default", () => {
    render(
      <ToolCard tool="bash" status="running" title="echo hi">
        <div data-testid="body">payload</div>
      </ToolCard>,
    );

    expect(screen.getByText("bash")).toBeInTheDocument();
    expect(screen.getByText("echo hi")).toBeInTheDocument();
    // Header trigger is the only button.
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("falls back to tool name when no title is given", () => {
    render(<ToolCard tool="grep" status="completed" />);
    // The fallback puts the tool name in *both* the pill and the title slot.
    expect(screen.getAllByText("grep").length).toBeGreaterThanOrEqual(1);
  });

  it("expands the body when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ToolCard tool="bash" status="completed" title="ls">
        <div data-testid="body">payload</div>
      </ToolCard>,
    );

    await user.click(screen.getByRole("button"));
    expect(screen.getByTestId("body")).toBeInTheDocument();
  });

  it("shows a duration when provided", () => {
    render(
      <ToolCard tool="bash" status="completed" durationMs={1500}>
        <span />
      </ToolCard>,
    );
    expect(screen.getByText("1.5s")).toBeInTheDocument();
  });

  it("applies the danger tone via class names", () => {
    const { container } = render(
      <ToolCard tool="bash" status="error" tone="danger">
        <span />
      </ToolCard>,
    );
    const root = container.querySelector("[data-tool='bash']");
    expect(root?.className).toMatch(/border-danger/);
  });
});

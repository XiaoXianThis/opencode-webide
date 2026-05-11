import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GenericTool } from "../GenericTool";
import { makeToolPart, completedState, errorState } from "./fixtures";

describe("GenericTool", () => {
  it("renders the tool name, input JSON and output text after expanding", async () => {
    const user = userEvent.setup();
    const part = makeToolPart({
      tool: "mystery",
      state: completedState({ key: "value" }, "raw output"),
    });
    render(<GenericTool part={part} />);

    expect(screen.getByText("mystery")).toBeInTheDocument();
    await user.click(screen.getByRole("button"));
    // input header label exists and shows the serialised value
    expect(screen.getAllByText("input").length).toBeGreaterThan(0);
    expect(screen.getByText(/"key": "value"/)).toBeInTheDocument();
    expect(screen.getByText("raw output")).toBeInTheDocument();
  });

  it("shows an error block when the tool fails", async () => {
    const user = userEvent.setup();
    const part = makeToolPart({
      tool: "mystery",
      state: errorState({}, "oops"),
    });
    render(<GenericTool part={part} />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("alert").textContent).toMatch(/oops/);
  });
});

import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BashTool } from "../BashTool";
import { makeToolPart, runningState, completedState, errorState } from "./fixtures";

describe("BashTool", () => {
  it("renders the description as the title and shows a duration", () => {
    const part = makeToolPart({
      tool: "bash",
      state: completedState({ command: "ls -la", description: "list files" }, "a\nb\n", {
        duration: 1500,
        metadata: { exit: 0 },
      }),
    });
    render(<BashTool part={part} />);
    expect(screen.getByText("bash")).toBeInTheDocument();
    expect(screen.getByText("list files")).toBeInTheDocument();
    expect(screen.getByText("1.5s")).toBeInTheDocument();
    expect(screen.getByTestId("bash-exit").textContent).toMatch(/exit 0/);
  });

  it("expands to show the command, stdout and a non-zero exit", async () => {
    const user = userEvent.setup();
    const part = makeToolPart({
      tool: "bash",
      state: completedState({ command: "false" }, "", {
        metadata: { exit: 1, stderr: "boom" },
      }),
    });
    render(<BashTool part={part} />);
    await user.click(screen.getByRole("button"));

    expect(screen.getByTestId("bash-command").textContent).toBe("$ false");
    expect(screen.getByTestId("bash-stderr").textContent).toBe("boom");
    expect(screen.getByTestId("bash-exit").textContent).toMatch(/exit 1/);
  });

  it("shows a spinner-style state while running", () => {
    const part = makeToolPart({
      tool: "bash",
      state: runningState({ command: "sleep 1" }, "running", {}),
    });
    render(<BashTool part={part} />);
    expect(screen.getByLabelText("running")).toBeInTheDocument();
  });

  it("renders an error message in the body when the call fails", async () => {
    const user = userEvent.setup();
    const part = makeToolPart({
      tool: "bash",
      state: errorState({ command: "ls" }, "permission denied"),
    });
    render(<BashTool part={part} />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("alert").textContent).toMatch(/permission denied/);
  });
});

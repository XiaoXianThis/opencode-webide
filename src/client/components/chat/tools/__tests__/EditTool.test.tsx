import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditTool } from "../EditTool";
import { makeToolPart, completedState, errorState } from "./fixtures";

describe("EditTool", () => {
  it("renders +/- counts in the header for a small modification", () => {
    const part = makeToolPart({
      tool: "edit",
      state: completedState(
        {
          filePath: "/repo/src/foo.ts",
          oldString: "a\nb\nc",
          newString: "a\nB\nc",
        },
        "ok",
      ),
    });
    render(<EditTool part={part} />);
    expect(screen.getByTestId("edit-added").textContent).toBe("+1");
    expect(screen.getByTestId("edit-removed").textContent).toBe("-1");
  });

  it("renders the file basename in the title and the full path in the body", async () => {
    const user = userEvent.setup();
    const part = makeToolPart({
      tool: "edit",
      state: completedState(
        { filePath: "/abs/path/to/main.tsx", oldString: "x", newString: "y" },
        "ok",
      ),
    });
    render(<EditTool part={part} />);
    expect(screen.getByText("main.tsx")).toBeInTheDocument();
    await user.click(screen.getByRole("button"));
    expect(screen.getByTestId("edit-file").textContent).toBe("/abs/path/to/main.tsx");
  });

  it("renders add/remove/equal rows in the diff body", async () => {
    const user = userEvent.setup();
    const part = makeToolPart({
      tool: "edit",
      state: completedState(
        { filePath: "f.txt", oldString: "keep\ndrop", newString: "keep\nadd" },
        "ok",
      ),
    });
    render(<EditTool part={part} />);
    await user.click(screen.getByRole("button"));

    const diff = screen.getByTestId("edit-diff");
    const ops = Array.from(diff.querySelectorAll("[data-op]")).map(
      (el) => el.getAttribute("data-op"),
    );
    expect(ops).toEqual(expect.arrayContaining(["equal", "remove", "add"]));
  });

  it("flags replaceAll input with a chip", () => {
    const part = makeToolPart({
      tool: "edit",
      state: completedState(
        { filePath: "f.txt", oldString: "x", newString: "y", replaceAll: true },
        "ok",
      ),
    });
    render(<EditTool part={part} />);
    expect(screen.getByText("all")).toBeInTheDocument();
  });

  it("shows an error message when the tool fails", async () => {
    const user = userEvent.setup();
    const part = makeToolPart({
      tool: "edit",
      state: errorState({ filePath: "f.txt", oldString: "x", newString: "y" }, "no match"),
    });
    render(<EditTool part={part} />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("alert").textContent).toMatch(/no match/);
  });
});

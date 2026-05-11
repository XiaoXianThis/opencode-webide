import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GlobTool } from "../GlobTool";
import { makeToolPart, completedState } from "./fixtures";

describe("GlobTool", () => {
  it("shows the path count and a list of files", async () => {
    const user = userEvent.setup();
    const part = makeToolPart({
      tool: "glob",
      state: completedState({ pattern: "**/*.ts" }, "a.ts\nb.ts\nsub/c.ts"),
    });
    render(<GlobTool part={part} />);
    expect(screen.getByTestId("glob-count").textContent).toBe("3");

    await user.click(screen.getByRole("button"));
    const items = screen.getAllByRole("listitem");
    expect(items.map((el) => el.textContent)).toEqual(["a.ts", "b.ts", "sub/c.ts"]);
  });

  it("renders the empty-state hint when no paths matched", async () => {
    const user = userEvent.setup();
    const part = makeToolPart({
      tool: "glob",
      state: completedState({ pattern: "**/missing.xyz" }, ""),
    });
    render(<GlobTool part={part} />);
    expect(screen.getByTestId("glob-count").textContent).toBe("0");

    await user.click(screen.getByRole("button"));
    expect(screen.getByTestId("glob-empty")).toBeInTheDocument();
  });
});

import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReadTool } from "../ReadTool";
import { makeToolPart, completedState } from "./fixtures";

describe("ReadTool", () => {
  it("collapses output longer than 5 lines and exposes an expand button", async () => {
    const user = userEvent.setup();
    const longOutput = Array.from({ length: 12 }, (_, i) => `line ${i + 1}`).join("\n");
    const part = makeToolPart({
      tool: "read",
      state: completedState({ filePath: "/a/b.txt" }, longOutput),
    });
    render(<ReadTool part={part} />);
    await user.click(screen.getByRole("button", { name: /b\.txt/ }));

    const content = screen.getByTestId("read-content");
    expect(content.textContent).toContain("line 1");
    expect(content.textContent).toContain("line 5");
    expect(content.textContent).not.toContain("line 6");

    const expandBtn = screen.getByTestId("read-expand");
    expect(expandBtn.textContent).toMatch(/12/);

    await user.click(expandBtn);
    expect(screen.getByTestId("read-content").textContent).toContain("line 12");
  });

  it("renders all lines (no expand button) when output is short", async () => {
    const user = userEvent.setup();
    const part = makeToolPart({
      tool: "read",
      state: completedState({ filePath: "/a/b.txt" }, "one\ntwo"),
    });
    render(<ReadTool part={part} />);
    await user.click(screen.getByRole("button", { name: /b\.txt/ }));

    expect(screen.getByTestId("read-content").textContent).toContain("two");
    expect(screen.queryByTestId("read-expand")).toBeNull();
  });

  it("shows the line count badge", () => {
    const part = makeToolPart({
      tool: "read",
      state: completedState({ filePath: "/a/b.txt" }, "x\ny\nz"),
    });
    render(<ReadTool part={part} />);
    expect(screen.getByTestId("read-line-count").textContent).toMatch(/3 lines/);
  });

  it("offsets line numbers by the requested offset", async () => {
    const user = userEvent.setup();
    const part = makeToolPart({
      tool: "read",
      state: completedState({ filePath: "/a/b.txt", offset: 100 }, "alpha"),
    });
    render(<ReadTool part={part} />);
    await user.click(screen.getByRole("button", { name: /b\.txt/ }));
    expect(screen.getByTestId("read-content").textContent).toMatch(/101\s*alpha/);
  });
});

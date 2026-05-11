import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GrepTool } from "../GrepTool";
import { makeToolPart, completedState } from "./fixtures";

describe("GrepTool", () => {
  it("groups matches by file and reports counts in the header", async () => {
    const user = userEvent.setup();
    const output = [
      "src/a.ts:10:foo bar",
      "src/a.ts:42:another foo",
      "src/b.ts:7:foo here",
    ].join("\n");
    const part = makeToolPart({
      tool: "grep",
      state: completedState({ pattern: "foo" }, output),
    });
    render(<GrepTool part={part} />);

    expect(screen.getByTestId("grep-match-count").textContent).toBe("3");
    expect(screen.getByTestId("grep-file-count").textContent).toBe("2");

    await user.click(screen.getByRole("button"));
    const fileHeaders = screen.getAllByTestId("grep-file");
    expect(fileHeaders.map((el) => el.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("src/a.ts"),
        expect.stringContaining("src/b.ts"),
      ]),
    );
  });

  it("highlights the search pattern within each match", async () => {
    const user = userEvent.setup();
    const part = makeToolPart({
      tool: "grep",
      state: completedState({ pattern: "foo" }, "src/a.ts:1:foo bar"),
    });
    render(<GrepTool part={part} />);
    await user.click(screen.getByRole("button"));

    const marks = screen.getAllByTestId("grep-highlight");
    expect(marks.length).toBeGreaterThanOrEqual(1);
    expect(marks[0]!.textContent).toBe("foo");
  });

  it("ignores invalid regex patterns gracefully (no highlight)", async () => {
    const user = userEvent.setup();
    const part = makeToolPart({
      tool: "grep",
      state: completedState({ pattern: "(unclosed" }, "src/a.ts:1:hello"),
    });
    render(<GrepTool part={part} />);
    await user.click(screen.getByRole("button"));
    expect(screen.queryAllByTestId("grep-highlight")).toHaveLength(0);
  });

  it("falls back to raw output when no matches are parseable", async () => {
    const user = userEvent.setup();
    const part = makeToolPart({
      tool: "grep",
      state: completedState({ pattern: "foo" }, "no structured output here"),
    });
    render(<GrepTool part={part} />);
    await user.click(screen.getByRole("button"));
    expect(screen.queryByTestId("grep-results")).toBeNull();
  });
});

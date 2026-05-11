import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WebFetchTool } from "../WebFetchTool";
import { makeToolPart, completedState } from "./fixtures";

describe("WebFetchTool", () => {
  it("renders an external link for safe http(s) URLs with rel=noopener", async () => {
    const user = userEvent.setup();
    const part = makeToolPart({
      tool: "webfetch",
      state: completedState(
        { url: "https://example.com/page", prompt: "Summarise" },
        "Article body…",
      ),
    });
    render(<WebFetchTool part={part} />);

    await user.click(screen.getByRole("button"));
    const link = screen.getByTestId("webfetch-link");
    expect(link).toHaveAttribute("href", "https://example.com/page");
    const rel = link.getAttribute("rel") ?? "";
    expect(rel).toMatch(/noopener/);
    expect(rel).toMatch(/noreferrer/);
    expect(screen.getByTestId("webfetch-output").textContent).toContain("Article body");
  });

  it("disables click for non-http(s) URLs (e.g. javascript:)", async () => {
    const user = userEvent.setup();
    const part = makeToolPart({
      tool: "webfetch",
      state: completedState({ url: "javascript:alert(1)" }, "ok"),
    });
    render(<WebFetchTool part={part} />);
    await user.click(screen.getByRole("button"));

    expect(screen.queryByTestId("webfetch-link")).toBeNull();
    expect(screen.getByTestId("webfetch-unsafe").textContent).toBe("javascript:alert(1)");
  });
});

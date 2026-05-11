import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WebSearchTool } from "../WebSearchTool";
import { makeToolPart, completedState } from "./fixtures";

describe("WebSearchTool", () => {
  it("renders the query in the header and body", async () => {
    const user = userEvent.setup();
    const part = makeToolPart({
      tool: "websearch",
      state: completedState({ query: "react aria popover" }, "result list…"),
    });
    render(<WebSearchTool part={part} />);
    // Query appears in both the header title and the body; getAllByText avoids the ambiguity.
    expect(screen.getAllByText("react aria popover").length).toBeGreaterThanOrEqual(1);

    await user.click(screen.getByRole("button"));
    expect(screen.getByTestId("websearch-query").textContent).toBe("react aria popover");
    expect(screen.getByTestId("websearch-output").textContent).toContain("result list");
  });
});

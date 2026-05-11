import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import { WriteTool } from "../WriteTool";
import { makeToolPart, completedState } from "./fixtures";

describe("WriteTool", () => {
  it("shows a 'created' badge when metadata.created is true", () => {
    const part = makeToolPart({
      tool: "write",
      state: completedState(
        { filePath: "/n/new.ts", content: "export {}\n" },
        "ok",
        { metadata: { created: true } },
      ),
    });
    render(<WriteTool part={part} />);
    expect(screen.getByTestId("write-created-badge")).toBeInTheDocument();
    expect(screen.queryByTestId("write-overwrite-badge")).toBeNull();
  });

  it("shows an 'overwritten' badge when metadata.created is false", () => {
    const part = makeToolPart({
      tool: "write",
      state: completedState(
        { filePath: "/n/new.ts", content: "x" },
        "ok",
        { metadata: { created: false } },
      ),
    });
    render(<WriteTool part={part} />);
    expect(screen.getByTestId("write-overwrite-badge")).toBeInTheDocument();
    expect(screen.queryByTestId("write-created-badge")).toBeNull();
  });

  it("shows neither badge when metadata is missing", () => {
    const part = makeToolPart({
      tool: "write",
      state: completedState({ filePath: "/n/x.ts", content: "x" }, "ok"),
    });
    render(<WriteTool part={part} />);
    expect(screen.queryByTestId("write-created-badge")).toBeNull();
    expect(screen.queryByTestId("write-overwrite-badge")).toBeNull();
  });
});

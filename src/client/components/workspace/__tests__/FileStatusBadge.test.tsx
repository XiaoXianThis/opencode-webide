import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import { FileStatusBadge } from "../FileStatusBadge";

describe("FileStatusBadge", () => {
  it("renders modified, staged, and untracked states", () => {
    render(<><FileStatusBadge status="modified" /><FileStatusBadge status="staged" /><FileStatusBadge status="untracked" /></>);
    expect(screen.getByTestId("file-status-modified")).toHaveTextContent("M");
    expect(screen.getByTestId("file-status-staged")).toHaveTextContent("S");
    expect(screen.getByTestId("file-status-untracked")).toHaveTextContent("U");
  });
});

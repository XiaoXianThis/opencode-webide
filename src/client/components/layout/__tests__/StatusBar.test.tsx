import { beforeEach, describe, expect, it } from "bun:test";
import { act, render, screen } from "@testing-library/react";
import type { Event } from "@opencode-ai/sdk/client";
import { useVcsStore } from "@/store/vcs";
import { StatusBar } from "../StatusBar";

beforeEach(() => {
  useVcsStore.setState({ branch: null, error: null });
});

describe("StatusBar", () => {
  it("shows the latest branch after consecutive events", () => {
    render(<StatusBar />);
    act(() => {
      useVcsStore.getState().applyEvent({ type: "vcs.branch.updated", properties: { branch: "one" } } as Event);
      useVcsStore.getState().applyEvent({ type: "vcs.branch.updated", properties: { branch: "two" } } as Event);
    });
    expect(screen.getByTestId("status-branch")).toHaveTextContent("git:two");
  });
});

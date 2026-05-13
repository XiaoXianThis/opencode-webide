import { beforeEach, describe, expect, it } from "bun:test";
import { act, render, screen } from "@testing-library/react";
import type { Event } from "@opencode-ai/sdk/client";
import { useVcsStore } from "@/store/vcs";
import { useLspStore } from "@/store/lsp";
import { StatusBar } from "../StatusBar";

beforeEach(() => {
  useVcsStore.setState({ branch: null, error: null, load: async () => {} });
  useLspStore.setState({ clients: [], loading: false, error: null, lastDiagnostics: null, load: async () => {} });
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

  it("shows LSP empty, connected, and error states", () => {
    render(<StatusBar />);
    expect(screen.getByTestId("status-lsp")).toHaveTextContent("LSP 未连接");

    act(() => {
      useLspStore.setState({ clients: [{ id: "ts", name: "typescript", root: "/repo", status: "connected" }] });
    });
    expect(screen.getByTestId("status-lsp")).toHaveTextContent("LSP 1 已连接");

    act(() => {
      useLspStore.setState({ clients: [{ id: "ts", name: "typescript", root: "/repo", status: "error" }] });
    });
    expect(screen.getByTestId("status-lsp")).toHaveTextContent("LSP 异常");
  });
});

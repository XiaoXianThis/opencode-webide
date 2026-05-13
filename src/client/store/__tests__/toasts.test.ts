import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { Event } from "@opencode-ai/sdk/client";

const { useToastsStore } = await import("../toasts");

beforeEach(() => {
  useToastsStore.setState({ toasts: [] });
});

describe("toasts store", () => {
  it("shows and dismisses toast events routed from the SDK", () => {
    const id = useToastsStore.getState().show({ message: "Saved", variant: "success", title: "Done", duration: 0 });

    expect(useToastsStore.getState().toasts[0]).toMatchObject({ id, message: "Saved", variant: "success", title: "Done", duration: 0 });

    useToastsStore.getState().dismiss(id);
    expect(useToastsStore.getState().toasts).toHaveLength(0);
  });

  it("applies tui.toast.show events", () => {
    useToastsStore.getState().applyEvent({
      type: "tui.toast.show",
      properties: { message: "Indexed", variant: "info", duration: 0 },
    } as Event);

    expect(useToastsStore.getState().toasts[0]).toMatchObject({ message: "Indexed", variant: "info" });
  });

  it("auto-dismisses by duration", () => {
    const originalSetTimeout = window.setTimeout;
    const setTimeoutMock = mock((handler: TimerHandler) => {
      if (typeof handler === "function") handler();
      return 1;
    });
    window.setTimeout = setTimeoutMock;
    try {
      useToastsStore.getState().show({ message: "Gone", variant: "warning", duration: 25 });
    } finally {
      window.setTimeout = originalSetTimeout;
    }

    expect(setTimeoutMock).toHaveBeenCalledWith(expect.any(Function), 25);
    expect(useToastsStore.getState().toasts).toHaveLength(0);
  });

  it("keeps only the latest five toasts", () => {
    for (let index = 0; index < 6; index += 1) {
      useToastsStore.getState().show({ message: `toast-${index}`, variant: "info", duration: 0 });
    }

    expect(useToastsStore.getState().toasts).toHaveLength(5);
    expect(useToastsStore.getState().toasts[0]?.message).toBe("toast-1");
  });
});

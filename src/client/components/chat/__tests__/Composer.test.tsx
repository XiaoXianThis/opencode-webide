import { describe, it, expect, beforeEach, mock } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mutable state shared with the mocked stores so individual tests can flip
// values without re-mocking modules.
const messagesState = {
  streaming: {} as Record<string, boolean>,
  sendPrompt: mock(async (..._args: unknown[]) => {}),
  abort: mock(async (..._args: unknown[]) => {}),
};

const modelsState = {
  selectedProviderID: "anthropic" as string | null,
  selectedModelID: "claude-sonnet" as string | null,
};

mock.module("@/store/messages", () => ({
  useMessagesStore: <T,>(selector: (s: typeof messagesState) => T): T => selector(messagesState),
}));

mock.module("@/store/models", () => ({
  useModelsStore: <T,>(selector: (s: typeof modelsState) => T): T => selector(modelsState),
}));

// ModelPicker has its own dedicated tests; stub it inside the Composer so we
// don't pull the SDK into this test file.
mock.module("../ModelPicker", () => ({
  ModelPicker: () => null,
}));

const { Composer } = await import("../Composer");

beforeEach(() => {
  messagesState.sendPrompt.mockClear();
  messagesState.abort.mockClear();
  messagesState.streaming = {};
  modelsState.selectedProviderID = "anthropic";
  modelsState.selectedModelID = "claude-sonnet";
});

describe("Composer", () => {
  it("Enter sends with the currently selected model and clears the textarea", async () => {
    const user = userEvent.setup();
    render(<Composer sessionID="ses_1" />);

    const ta = screen.getByPlaceholderText(/输入消息/);
    await user.type(ta, "hello{enter}");

    expect(messagesState.sendPrompt).toHaveBeenCalledTimes(1);
    expect(messagesState.sendPrompt).toHaveBeenCalledWith("ses_1", "hello", {
      model: { providerID: "anthropic", modelID: "claude-sonnet" },
    });
    expect((ta as HTMLTextAreaElement).value).toBe("");
  });

  it("Shift+Enter inserts a newline instead of sending", async () => {
    const user = userEvent.setup();
    render(<Composer sessionID="ses_1" />);

    const ta = screen.getByPlaceholderText(/输入消息/);
    await user.type(ta, "line1{Shift>}{enter}{/Shift}line2");

    expect(messagesState.sendPrompt).not.toHaveBeenCalled();
    expect((ta as HTMLTextAreaElement).value).toBe("line1\nline2");
  });

  it("does not send whitespace-only text", async () => {
    const user = userEvent.setup();
    render(<Composer sessionID="ses_1" />);

    await user.type(screen.getByPlaceholderText(/输入消息/), "   {enter}");

    expect(messagesState.sendPrompt).not.toHaveBeenCalled();
  });

  it("send button is disabled until text is entered", async () => {
    const user = userEvent.setup();
    render(<Composer sessionID="ses_1" />);

    const sendBtn = screen.getByRole("button", { name: "发送" });
    expect(sendBtn).toHaveAttribute("data-disabled", "true");

    await user.type(screen.getByPlaceholderText(/输入消息/), "hi");
    expect(sendBtn).not.toHaveAttribute("data-disabled", "true");
  });

  it("omits model when none is selected (falls back to opencode default)", async () => {
    modelsState.selectedProviderID = null;
    modelsState.selectedModelID = null;

    const user = userEvent.setup();
    render(<Composer sessionID="ses_2" />);

    await user.type(screen.getByPlaceholderText(/输入消息/), "hi{enter}");

    expect(messagesState.sendPrompt).toHaveBeenCalledWith("ses_2", "hi", undefined);
  });

  it("shows the abort button while streaming and clicking it calls abort", async () => {
    messagesState.streaming = { ses_1: true };

    const user = userEvent.setup();
    render(<Composer sessionID="ses_1" />);

    expect(screen.queryByRole("button", { name: "发送" })).toBeNull();
    const abortBtn = screen.getByRole("button", { name: "中止生成" });
    await user.click(abortBtn);

    expect(messagesState.abort).toHaveBeenCalledWith("ses_1");
  });
});

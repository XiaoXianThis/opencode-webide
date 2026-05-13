import { describe, it, expect, beforeEach, mock } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const messagesState = {
  streaming: {} as Record<string, boolean>,
  sendPrompt: mock(async (..._args: unknown[]) => {}),
  abort: mock(async (..._args: unknown[]) => {}),
};

const modelsState = {
  selectedProviderID: "anthropic" as string | null,
  selectedModelID: "claude-sonnet" as string | null,
  fallbackNotice: null as string | null,
  dismissFallbackNotice: mock(() => {}),
};

const agentsState = { selectedAgent: "build" as string | null };

mock.module("@/store/messages", () => ({
  useMessagesStore: <T,>(selector: (s: typeof messagesState) => T): T => selector(messagesState),
}));
mock.module("@/store/models", () => ({
  useModelsStore: <T,>(selector: (s: typeof modelsState) => T): T => selector(modelsState),
}));
mock.module("@/store/agents", () => ({
  useAgentsStore: <T,>(selector: (s: typeof agentsState) => T): T => selector(agentsState),
}));
mock.module("../ModelPicker", () => ({ ModelPicker: () => null }));
mock.module("../AgentPicker", () => ({ AgentPicker: () => null }));

const { Composer } = await import("../Composer");

const textbox = (): HTMLTextAreaElement => screen.getByRole("textbox") as HTMLTextAreaElement;
const firstButton = (): HTMLElement => screen.getAllByRole("button")[0]!;

beforeEach(() => {
  messagesState.sendPrompt.mockClear();
  messagesState.abort.mockClear();
  messagesState.streaming = {};
  modelsState.selectedProviderID = "anthropic";
  modelsState.selectedModelID = "claude-sonnet";
  modelsState.fallbackNotice = null;
  modelsState.dismissFallbackNotice.mockClear();
  agentsState.selectedAgent = "build";
});

describe("Composer", () => {
  it("Enter sends with the selected agent and model and clears the textarea", async () => {
    const user = userEvent.setup();
    render(<Composer sessionID="ses_1" />);
    await user.type(textbox(), "hello{enter}");
    expect(messagesState.sendPrompt).toHaveBeenCalledTimes(1);
    expect(messagesState.sendPrompt).toHaveBeenCalledWith("ses_1", "hello", {
      agent: "build",
      model: { providerID: "anthropic", modelID: "claude-sonnet" },
    });
    expect(textbox().value).toBe("");
  });

  it("Shift+Enter inserts a newline instead of sending", async () => {
    const user = userEvent.setup();
    render(<Composer sessionID="ses_1" />);
    await user.type(textbox(), "line1{Shift>}{enter}{/Shift}line2");
    expect(messagesState.sendPrompt).not.toHaveBeenCalled();
    expect(textbox().value).toBe("line1\nline2");
  });

  it("does not send whitespace-only text", async () => {
    const user = userEvent.setup();
    render(<Composer sessionID="ses_1" />);
    await user.type(textbox(), "   {enter}");
    expect(messagesState.sendPrompt).not.toHaveBeenCalled();
  });

  it("disables and enables the send button based on trimmed content", async () => {
    const user = userEvent.setup();
    render(<Composer sessionID="ses_1" />);
    const sendBtn = firstButton();
    expect(sendBtn).toHaveAttribute("data-disabled", "true");
    await user.type(textbox(), "hi");
    expect(sendBtn).not.toHaveAttribute("data-disabled", "true");
  });

  it("sends only the selected agent when no model is selected", async () => {
    modelsState.selectedProviderID = null;
    modelsState.selectedModelID = null;
    const user = userEvent.setup();
    render(<Composer sessionID="ses_2" />);
    await user.type(textbox(), "hi{enter}");
    expect(messagesState.sendPrompt).toHaveBeenCalledWith("ses_2", "hi", { agent: "build" });
  });

  it("omits options when neither agent nor model is selected", async () => {
    modelsState.selectedProviderID = null;
    modelsState.selectedModelID = null;
    agentsState.selectedAgent = null;
    const user = userEvent.setup();
    render(<Composer sessionID="ses_3" />);
    await user.type(textbox(), "hi{enter}");
    expect(messagesState.sendPrompt).toHaveBeenCalledWith("ses_3", "hi", undefined);
  });

  it("shows and dismisses the model fallback notice", async () => {
    modelsState.fallbackNotice = "The previously selected model is unavailable. Switched to the default available model.";
    const user = userEvent.setup();
    render(<Composer sessionID="ses_1" />);
    expect(screen.getByRole("status")).toHaveTextContent("previously selected model is unavailable");
    await user.click(firstButton());
    expect(modelsState.dismissFallbackNotice).toHaveBeenCalledTimes(1);
  });

  it("shows the abort button while streaming and clicking it calls abort", async () => {
    messagesState.streaming = { ses_1: true };
    const user = userEvent.setup();
    render(<Composer sessionID="ses_1" />);
    await user.click(firstButton());
    expect(messagesState.abort).toHaveBeenCalledWith("ses_1");
  });
});

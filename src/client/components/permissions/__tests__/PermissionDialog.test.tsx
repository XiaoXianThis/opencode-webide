import { describe, it, expect, mock } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Permission } from "@opencode-ai/sdk/client";
import { PermissionDialog } from "../PermissionDialog";

function permission(overrides: Partial<Permission> = {}): Permission {
  return {
    id: "perm_1",
    type: "tool",
    sessionID: "ses_1",
    messageID: "msg_1",
    callID: "call_xyz",
    title: "Allow `bash` to run `rm -rf /`?",
    metadata: { command: "rm -rf /", cwd: "/tmp" },
    time: { created: 100 },
    ...overrides,
  };
}

describe("PermissionDialog", () => {
  it("renders the title, type, callID, and metadata rows", () => {
    render(<PermissionDialog permission={permission()} onReply={() => {}} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Allow `bash`/)).toBeInTheDocument();
    expect(screen.getByText(/tool · call_xyz/)).toBeInTheDocument();

    const meta = screen.getByTestId("permission-metadata");
    expect(meta.textContent).toContain("command");
    expect(meta.textContent).toContain("rm -rf /");
    expect(meta.textContent).toContain("cwd");
  });

  it("shows '+N more' when there are queued requests behind the head", () => {
    render(
      <PermissionDialog permission={permission()} queueDepth={3} onReply={() => {}} />,
    );
    expect(screen.getByTestId("permission-queue-depth").textContent).toBe("+3 more");
  });

  it("hides the queue depth chip when there are no extras", () => {
    render(<PermissionDialog permission={permission()} onReply={() => {}} />);
    expect(screen.queryByTestId("permission-queue-depth")).toBeNull();
  });

  it("calls onReply('once') when 允许一次 is clicked", async () => {
    const onReply = mock(() => {});
    const user = userEvent.setup();
    render(<PermissionDialog permission={permission()} onReply={onReply} />);
    await user.click(screen.getByTestId("permission-once"));
    expect(onReply).toHaveBeenCalledTimes(1);
    expect(onReply).toHaveBeenCalledWith("once");
  });

  it("calls onReply('always') when 始终允许 is clicked", async () => {
    const onReply = mock(() => {});
    const user = userEvent.setup();
    render(<PermissionDialog permission={permission()} onReply={onReply} />);
    await user.click(screen.getByTestId("permission-always"));
    expect(onReply).toHaveBeenCalledWith("always");
  });

  it("calls onReply('reject') when 拒绝 is clicked", async () => {
    const onReply = mock(() => {});
    const user = userEvent.setup();
    render(<PermissionDialog permission={permission()} onReply={onReply} />);
    await user.click(screen.getByTestId("permission-reject"));
    expect(onReply).toHaveBeenCalledWith("reject");
  });

  it("treats Escape as a rejection", async () => {
    const onReply = mock(() => {});
    const user = userEvent.setup();
    render(<PermissionDialog permission={permission()} onReply={onReply} />);
    await user.keyboard("{Escape}");
    expect(onReply).toHaveBeenCalledWith("reject");
  });

  it("disables all action buttons while a reply is in flight", () => {
    render(
      <PermissionDialog permission={permission()} isReplying onReply={() => {}} />,
    );
    expect(screen.getByTestId("permission-once")).toHaveAttribute("data-disabled", "true");
    expect(screen.getByTestId("permission-always")).toHaveAttribute("data-disabled", "true");
    expect(screen.getByTestId("permission-reject")).toHaveAttribute("data-disabled", "true");
  });

  it("omits the metadata section when there are no entries", () => {
    render(
      <PermissionDialog
        permission={permission({ metadata: {} })}
        onReply={() => {}}
      />,
    );
    expect(screen.queryByTestId("permission-metadata")).toBeNull();
  });
});

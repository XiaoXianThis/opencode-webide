import { describe, it, expect, beforeEach, mock } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Permission } from "@opencode-ai/sdk/client";

const respondFn = mock(async (_args: unknown) => ({ data: true }));

mock.module("@/lib/opencode", () => ({
  oc: { postSessionIdPermissionsPermissionId: respondFn },
}));

const { usePermissionsStore } = await import("@/store/permissions");
const { useSessionsStore } = await import("@/store/sessions");
const { PermissionCenter } = await import("../PermissionCenter");

function permission(id: string, overrides: Partial<Permission> = {}): Permission {
  return {
    id,
    type: "tool",
    sessionID: "ses_active",
    messageID: "msg_1",
    title: `Allow ${id}?`,
    metadata: {},
    time: { created: 100 },
    ...overrides,
  };
}

beforeEach(() => {
  respondFn.mockClear();
  usePermissionsStore.setState({ bySession: {}, pending: {} });
  useSessionsStore.setState({
    sessions: [
      {
        id: "ses_active",
        projectID: "p",
        directory: "/",
        title: "active",
        version: "1",
        time: { created: 0, updated: 0 },
      },
    ],
    activeId: "ses_active",
    loading: false,
    error: null,
  } as never);
});

describe("PermissionCenter", () => {
  it("renders nothing when there are no pending permissions", () => {
    render(<PermissionCenter />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("ignores permissions belonging to other sessions", () => {
    usePermissionsStore.setState({
      bySession: { other_session: [permission("p1", { sessionID: "other_session" })] },
      pending: {},
    });
    render(<PermissionCenter />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the head of the active queue and advances after a reply", async () => {
    const user = userEvent.setup();
    usePermissionsStore.setState({
      bySession: { ses_active: [permission("first"), permission("second")] },
      pending: {},
    });

    render(<PermissionCenter />);
    expect(screen.getByText(/Allow first\?/)).toBeInTheDocument();
    expect(screen.getByTestId("permission-queue-depth").textContent).toBe("+1 more");

    await user.click(screen.getByTestId("permission-once"));

    await waitFor(() => {
      expect(screen.getByText(/Allow second\?/)).toBeInTheDocument();
    });
    expect(respondFn).toHaveBeenCalledWith({
      path: { id: "ses_active", permissionID: "first" },
      body: { response: "once" },
    });
  });

  it("closes when the queue empties out", async () => {
    const user = userEvent.setup();
    usePermissionsStore.setState({
      bySession: { ses_active: [permission("only")] },
      pending: {},
    });

    render(<PermissionCenter />);
    await user.click(screen.getByTestId("permission-reject"));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});

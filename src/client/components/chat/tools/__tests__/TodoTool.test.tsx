import { describe, it, expect, beforeEach } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TodoTool } from "../TodoTool";
import { useTodosStore } from "@/store/todos";
import { makeToolPart, completedState } from "./fixtures";

beforeEach(() => {
  useTodosStore.setState({ bySession: {} });
});

describe("TodoTool", () => {
  it("groups todos by status and shows counts for each bucket", async () => {
    const user = userEvent.setup();
    const part = makeToolPart({
      tool: "todowrite",
      state: completedState(
        {
          todos: [
            { id: "1", content: "do thing", status: "pending", priority: "low" },
            { id: "2", content: "in flight", status: "in_progress", priority: "high" },
            { id: "3", content: "done thing", status: "completed", priority: "medium" },
            { id: "4", content: "scrapped", status: "cancelled", priority: "low" },
          ],
        },
        "ok",
      ),
    });
    render(<TodoTool part={part} />);

    expect(screen.getByTestId("todo-completed-count").textContent).toMatch(/1/);
    expect(screen.getByTestId("todo-in-progress-count").textContent).toMatch(/1/);
    expect(screen.getByTestId("todo-pending-count").textContent).toMatch(/1/);

    await user.click(screen.getByRole("button"));

    const items = screen.getAllByTestId("todo-item");
    expect(items).toHaveLength(4);
    const statuses = items.map((el) => el.getAttribute("data-status"));
    // in_progress comes first, cancelled last per the documented order.
    expect(statuses).toEqual(["in_progress", "pending", "completed", "cancelled"]);
  });

  it("prefers live store snapshot over the input fixture", () => {
    useTodosStore.setState({
      bySession: {
        ses_1: [
          { id: "live-1", content: "freshly updated", status: "in_progress", priority: "high" },
        ],
      },
    });
    const part = makeToolPart({
      tool: "todowrite",
      sessionID: "ses_1",
      state: completedState(
        { todos: [{ id: "stale", content: "old", status: "pending", priority: "low" }] },
        "ok",
      ),
    });
    render(<TodoTool part={part} />);
    expect(screen.getByText("1 todos")).toBeInTheDocument();
    expect(screen.queryByText("old")).toBeNull();
  });

  it("renders empty-state when no todos exist", async () => {
    const user = userEvent.setup();
    const part = makeToolPart({
      tool: "todowrite",
      state: completedState({ todos: [] }, "ok"),
    });
    render(<TodoTool part={part} />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByText(/暂无任务/)).toBeInTheDocument();
  });
});

import { expect, test } from "@playwright/test";

test("M2 chat shell loads and exposes the composer", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/status") {
      await route.fulfill({ json: { authenticated: true, enabled: false } });
      return;
    }
    if (url.pathname === "/api/session") {
      await route.fulfill({ json: [] });
      return;
    }
    if (url.pathname === "/api/project") {
      await route.fulfill({ json: [] });
      return;
    }
    if (url.pathname === "/api/project/current") {
      await route.fulfill({ json: { id: "project", worktree: "/repo", time: { created: 1 } } });
      return;
    }
    if (url.pathname === "/api/file") {
      await route.fulfill({ json: [] });
      return;
    }
    if (url.pathname === "/api/file/status") {
      await route.fulfill({ json: [] });
      return;
    }
    if (url.pathname === "/api/vcs") {
      await route.fulfill({ json: { branch: "main" } });
      return;
    }
    if (url.pathname === "/api/lsp") {
      await route.fulfill({ json: [] });
      return;
    }
    if (url.pathname === "/api/pty") {
      await route.fulfill({ json: [] });
      return;
    }
    await route.fulfill({ json: [] });
  });
  await page.route("**/api/events", async (route) => {
    await route.fulfill({ status: 204, body: "" });
  });

  await page.goto("/");
  await expect(page.getByText("opencode WebIDE")).toBeVisible();
  await expect(page.getByText("未选择会话").first()).toBeVisible();
});

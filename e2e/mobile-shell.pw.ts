import { expect, test, type Page } from "@playwright/test";

async function mockApi(page: Page) {
  await page.route("**/api/events", async (route) => {
    await route.fulfill({ status: 204, body: "" });
  });
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/status") {
      await route.fulfill({ json: { authenticated: true, authEnabled: false } });
      return;
    }
    if (url.pathname === "/api/project") {
      await route.fulfill({ json: [{ id: "project", worktree: "/repo/mobile", time: { created: 1 } }] });
      return;
    }
    if (url.pathname === "/api/project/current") {
      await route.fulfill({ json: { id: "project", worktree: "/repo/mobile", time: { created: 1 } } });
      return;
    }
    if (url.pathname === "/api/session") {
      await route.fulfill({ json: [] });
      return;
    }
    if (url.pathname === "/api/file") {
      await route.fulfill({ json: [{ name: "README.md", path: "README.md", absolute: "/repo/mobile/README.md", type: "file", ignored: false }] });
      return;
    }
    if (url.pathname === "/api/file/status") {
      await route.fulfill({ json: [] });
      return;
    }
    if (url.pathname === "/api/file/content") {
      await route.fulfill({ json: { type: "text", content: "hello mobile" } });
      return;
    }
    if (url.pathname === "/api/pty") {
      await route.fulfill({ json: [] });
      return;
    }
    await route.fulfill({ json: [] });
  });
}

test("mobile shell supports bottom-tab navigation", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile-only route guard redirects desktop projects to /");
  await mockApi(page);

  await page.goto("/m/projects");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/m\/projects/);

  await expect(page.getByRole("navigation", { name: "移动端主导航" })).toBeVisible();
  await expect(page.getByText("mobile").first()).toBeVisible();

  await page.getByRole("link", { name: /文件/ }).click();
  await expect(page).toHaveURL(/\/m\/files/);
  await expect(page.getByRole("button", { name: /README\.md/ })).toBeVisible();

  await page.getByRole("link", { name: /我的/ }).click();
  await expect(page.getByText("PWA 安装")).toBeVisible();
});

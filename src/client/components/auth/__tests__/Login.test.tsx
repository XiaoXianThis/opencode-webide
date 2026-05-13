import { describe, it, expect, beforeEach, mock } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const loginWithToken = mock(async (_token: string) => false);
const redirectAfterLogin = mock(() => {});

mock.module("@/lib/auth", () => ({
  loginWithToken,
  redirectAfterLogin,
}));

const { Login } = await import("../Login");

beforeEach(() => {
  loginWithToken.mockClear();
  redirectAfterLogin.mockClear();
  loginWithToken.mockImplementation(async () => false);
});

describe("Login", () => {
  it("shows an error for an incorrect token", async () => {
    const user = userEvent.setup();
    render(<Login />);

    await user.type(screen.getByLabelText("WebIDE token"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(loginWithToken).toHaveBeenCalledWith("wrong");
    expect(await screen.findByText("Token is incorrect")).toBeInTheDocument();
    expect(redirectAfterLogin).not.toHaveBeenCalled();
  });

  it("redirects after a successful login", async () => {
    loginWithToken.mockImplementation(async () => true);
    const user = userEvent.setup();
    render(<Login />);

    await user.type(screen.getByLabelText("WebIDE token"), "secret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(redirectAfterLogin).toHaveBeenCalledTimes(1));
  });
});

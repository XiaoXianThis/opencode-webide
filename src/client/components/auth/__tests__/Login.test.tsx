import { describe, it, expect, beforeEach, mock } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const loginWithToken = mock(async (_token: string) => false);
mock.module("@/lib/auth", () => ({
  loginWithToken,
}));

const { Login } = await import("../Login");

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login?returnTo=/m/chat"]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-path">{location.pathname}</div>;
}

beforeEach(() => {
  loginWithToken.mockClear();
  loginWithToken.mockImplementation(async () => false);
});

describe("Login", () => {
  it("shows an error for an incorrect token", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText("WebIDE token"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(loginWithToken).toHaveBeenCalledWith("wrong");
    expect(await screen.findByText("Token is incorrect")).toBeInTheDocument();
  });

  it("redirects after a successful login", async () => {
    loginWithToken.mockImplementation(async () => true);
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText("WebIDE token"), "secret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(screen.getByTestId("location-path")).toHaveTextContent("/m/chat"));
  });
});

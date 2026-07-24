// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthResetPasswordPage } from "./reset-password";

const ACCOUNT_EXISTS_COPY = /If an account exists for/;
const ACCOUNT_FOUND_COPY = /account was found/i;

const mocks = vi.hoisted(() => ({
  redirectAfterPasswordReset: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock("@/features/auth/redirect-after-password-reset", () => ({
  redirectAfterPasswordReset: mocks.redirectAfterPasswordReset,
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    requestPasswordReset: mocks.requestPasswordReset,
    resetPassword: mocks.resetPassword,
  },
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mocks.redirectAfterPasswordReset.mockReset();
  mocks.requestPasswordReset.mockReset();
  mocks.requestPasswordReset.mockResolvedValue({ error: null });
  mocks.resetPassword.mockReset();
  mocks.resetPassword.mockResolvedValue({ error: null });
});

describe("AuthResetPasswordPage", () => {
  it("requests and resends a reset link without revealing account existence", async () => {
    const user = userEvent.setup();
    render(<AuthResetPasswordPage invalidToken={false} token={null} />);

    await user.type(screen.getByLabelText("Email"), "person@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() => {
      expect(mocks.requestPasswordReset).toHaveBeenCalledWith({
        email: "person@example.com",
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
    });
    expect(screen.getByText(ACCOUNT_EXISTS_COPY)).toBeInTheDocument();
    expect(screen.queryByText(ACCOUNT_FOUND_COPY)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Resend link" }));
    expect(mocks.requestPasswordReset).toHaveBeenCalledTimes(2);
  });

  it("shows request errors and keeps the request form available", async () => {
    const user = userEvent.setup();
    mocks.requestPasswordReset.mockResolvedValue({
      error: { message: "Email service unavailable" },
    });
    render(<AuthResetPasswordPage invalidToken={false} token={null} />);

    await user.type(screen.getByLabelText("Email"), "person@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByText("Email service unavailable")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Send reset link" })
    ).toBeVisible();
  });

  it("validates and submits a new password with the reset token", async () => {
    const user = userEvent.setup();
    render(<AuthResetPasswordPage invalidToken={false} token="reset-token" />);

    await user.type(screen.getByLabelText("New password"), "short");
    await user.type(screen.getByLabelText("Confirm password"), "short");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    expect(
      await screen.findAllByText("Password must be at least 8 characters")
    ).toHaveLength(2);
    expect(mocks.resetPassword).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("New password"));
    await user.clear(screen.getByLabelText("Confirm password"));
    await user.type(screen.getByLabelText("New password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "different123");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByText("Passwords do not match")).toBeVisible();
    expect(mocks.resetPassword).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Confirm password"));
    await user.type(screen.getByLabelText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    await waitFor(() => {
      expect(mocks.resetPassword).toHaveBeenCalledWith({
        newPassword: "password123",
        token: "reset-token",
      });
    });
    expect(mocks.redirectAfterPasswordReset).toHaveBeenCalledOnce();
  });

  it("shows reset API errors without redirecting", async () => {
    const user = userEvent.setup();
    mocks.resetPassword.mockResolvedValue({
      error: { message: "Reset token expired" },
    });
    render(<AuthResetPasswordPage invalidToken={false} token="reset-token" />);

    await user.type(screen.getByLabelText("New password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByText("Reset token expired")).toBeVisible();
    expect(mocks.redirectAfterPasswordReset).not.toHaveBeenCalled();
  });

  it("renders an invalid-token state with a new-request action", () => {
    render(<AuthResetPasswordPage invalidToken token={null} />);

    expect(screen.getByText("Reset link expired")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Request a new link" })
    ).toHaveAttribute("href", "/auth/reset-password");
    expect(mocks.resetPassword).not.toHaveBeenCalled();
  });
});

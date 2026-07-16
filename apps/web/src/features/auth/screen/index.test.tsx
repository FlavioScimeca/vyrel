// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthMode } from "@/features/auth/form.schema";
import { AuthForm, AuthScreen } from "./index";

const mocks = vi.hoisted(() => ({
  createAccount: vi.fn(),
  replace: vi.fn(),
  search: "",
  signInEmail: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("@/features/auth/create-account", () => ({
  createAccount: mocks.createAccount,
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      email: mocks.signInEmail,
    },
  },
}));

function AuthFormHarness({
  initialMode = "signin",
  onSuccess,
}: {
  initialMode?: AuthMode;
  onSuccess: () => Promise<void>;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  return <AuthForm mode={mode} onModeChange={setMode} onSuccess={onSuccess} />;
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mocks.createAccount.mockReset();
  mocks.createAccount.mockResolvedValue({ ok: true });
  mocks.replace.mockReset();
  mocks.search = "";
  mocks.signInEmail.mockReset();
  mocks.signInEmail.mockResolvedValue({ error: null });
});

describe("AuthScreen", () => {
  it("shows sign in fields by default and keeps mode in the URL", async () => {
    const user = userEvent.setup();
    const view = render(<AuthScreen />);

    expect(screen.getByText("Welcome back")).toBeVisible();
    expect(screen.getByLabelText("Email")).toBeVisible();
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "current-password"
    );
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Sign up" }));
    expect(mocks.replace).toHaveBeenCalledWith("/auth?mode=signup", {
      scroll: false,
    });

    mocks.search = "mode=signup";
    view.rerender(<AuthScreen />);

    expect(screen.getByText("Create an account")).toBeVisible();
    expect(screen.getByLabelText("Name")).toBeVisible();
    expect(screen.getByLabelText("Confirm password")).toBeVisible();
  });
});

describe("AuthForm", () => {
  it("preserves shared fields and discards sign up-only fields", async () => {
    const user = userEvent.setup();
    render(<AuthFormHarness onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText("Email"), "person@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("tab", { name: "Sign up" }));

    expect(screen.getByLabelText("Email")).toHaveValue("person@example.com");
    expect(screen.getByLabelText("Password")).toHaveValue("password123");

    await user.type(screen.getByLabelText("Name"), "Test Person");
    await user.type(screen.getByLabelText("Confirm password"), "password123");
    await user.click(screen.getByRole("tab", { name: "Sign in" }));
    await user.click(screen.getByRole("tab", { name: "Sign up" }));

    expect(screen.getByLabelText("Email")).toHaveValue("person@example.com");
    expect(screen.getByLabelText("Password")).toHaveValue("password123");
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Confirm password")).toHaveValue("");
  });

  it("clears sign up validation errors when changing modes", async () => {
    const user = userEvent.setup();
    render(<AuthFormHarness initialMode="signup" onSuccess={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Name is required")).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "Sign in" }));
    await user.click(screen.getByRole("tab", { name: "Sign up" }));

    expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
  });

  it("submits sign in credentials and calls the success handler", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    render(<AuthFormHarness onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("Email"), "person@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mocks.signInEmail).toHaveBeenCalledWith({
        email: "person@example.com",
        password: "password123",
      });
    });
    expect(mocks.createAccount).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("submits the sign up payload and calls the success handler", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    render(<AuthFormHarness initialMode="signup" onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("Name"), "Test Person");
    await user.type(screen.getByLabelText("Email"), "person@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(mocks.createAccount).toHaveBeenCalledWith({
        avatar: undefined,
        email: "person@example.com",
        name: "Test Person",
        password: "password123",
      });
    });
    expect(mocks.signInEmail).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("shows authentication errors at the form root", async () => {
    const user = userEvent.setup();
    mocks.signInEmail.mockResolvedValue({
      error: { message: "Invalid credentials" },
    });
    render(<AuthFormHarness onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText("Email"), "person@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Invalid credentials")).toBeVisible();
  });

  it("disables mode switching while a submission is pending", async () => {
    let finishSignIn: (result: { error: { message: string } | null }) => void =
      () => undefined;
    mocks.signInEmail.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishSignIn = resolve;
        })
    );
    const user = userEvent.setup();
    render(<AuthFormHarness onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText("Email"), "person@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Sign in" })).toBeDisabled();
      expect(screen.getByRole("tab", { name: "Sign up" })).toBeDisabled();
    });

    act(() => {
      finishSignIn({ error: { message: "Stopped" } });
    });
  });
});

// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthMode } from "@/features/auth/form.schema";
import { AuthForm } from "./auth-form";
import { AuthScreen } from "./index";

const mocks = vi.hoisted(() => ({
  createAccount: vi.fn(),
  search: "",
  signInEmail: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("framer-motion", async () => {
  const actual =
    await vi.importActual<typeof import("framer-motion")>("framer-motion");

  return {
    ...actual,
    useReducedMotion: () => true,
  };
});

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
  const switchToSignIn = useCallback(() => {
    setMode("signin");
  }, []);
  const switchToSignUp = useCallback(() => {
    setMode("signup");
  }, []);

  return (
    <>
      <button onClick={switchToSignIn} type="button">
        Switch to sign in
      </button>
      <button onClick={switchToSignUp} type="button">
        Switch to sign up
      </button>
      <AuthForm mode={mode} onSuccessAction={onSuccess} />
    </>
  );
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mocks.createAccount.mockReset();
  mocks.createAccount.mockResolvedValue({ ok: true });
  mocks.search = "";
  mocks.signInEmail.mockReset();
  mocks.signInEmail.mockResolvedValue({ error: null });
});

describe("AuthScreen", () => {
  it("shows sign in fields by default and links to sign up mode", () => {
    const view = render(<AuthScreen />);

    expect(screen.getByText("Welcome back")).toBeVisible();
    expect(screen.getByLabelText("Email")).toBeVisible();
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "current-password"
    );
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Register a new account" })
    ).toHaveAttribute("href", "/auth?mode=signup");
    expect(
      screen.getByRole("link", { name: "Forgot password?" })
    ).toHaveAttribute("href", "/auth/reset-password");

    mocks.search = "mode=signup";
    view.rerender(<AuthScreen />);

    expect(screen.getByText("Create an account")).toBeVisible();
    expect(screen.getByLabelText("Name")).toBeVisible();
    expect(screen.getByLabelText("Confirm password")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Log in to an existing account" })
    ).toHaveAttribute("href", "/auth");
    expect(
      screen.queryByRole("link", { name: "Forgot password?" })
    ).not.toBeInTheDocument();
  });
});

describe("AuthForm", () => {
  it("preserves shared fields and discards sign up-only fields", async () => {
    const user = userEvent.setup();
    render(<AuthFormHarness onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText("Email"), "person@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Switch to sign up" }));

    expect(screen.getByLabelText("Email")).toHaveValue("person@example.com");
    expect(screen.getByLabelText("Password")).toHaveValue("password123");

    await user.type(screen.getByLabelText("Name"), "Test Person");
    await user.type(screen.getByLabelText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: "Switch to sign in" }));
    await user.click(screen.getByRole("button", { name: "Switch to sign up" }));

    expect(screen.getByLabelText("Email")).toHaveValue("person@example.com");
    expect(screen.getByLabelText("Password")).toHaveValue("password123");
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Confirm password")).toHaveValue("");
  });

  it("requires a name when creating an account", async () => {
    const user = userEvent.setup();
    render(<AuthFormHarness initialMode="signup" onSuccess={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Name is required")).toBeVisible();
    expect(
      screen.queryByText("Invalid input: expected string, received undefined")
    ).not.toBeInTheDocument();
  });

  it("clears sign up validation errors when changing modes", async () => {
    const user = userEvent.setup();
    render(<AuthFormHarness initialMode="signup" onSuccess={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Name is required")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Switch to sign in" }));
    await user.click(screen.getByRole("button", { name: "Switch to sign up" }));

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
});

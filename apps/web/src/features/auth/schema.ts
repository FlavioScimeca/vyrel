import type {
  UserTypeCreate,
  UserTypeUpdate,
} from "@vyrel/api/models/user/types/base.types";

export type AuthMode = "signin" | "signup";

export type AuthFormValues = UserTypeUpdate | UserTypeCreate;

export const authDefaultValues = {
  signin: {
    email: "",
    password: "",
    avatar: undefined,
  },
  signup: {
    email: "",
    password: "",
    name: "",
  },
} as const satisfies Record<AuthMode, AuthFormValues>;

type AuthFieldInput = "text" | "email" | "password" | "textarea";

export type AuthSignUpColumn = "left" | "right";

export type AuthFieldConfig = {
  name: keyof UserTypeCreate;
  label: string;
  description: string;
  placeholder: string;
  input: AuthFieldInput;
  autoComplete: string;
  modes: readonly AuthMode[];
  column?: AuthSignUpColumn;
  showDescriptionOnSignup?: boolean;
};

const authFieldConfigs: AuthFieldConfig[] = [
  {
    name: "name",
    label: "Name",
    description: "Enter your name to sign up.",
    placeholder: "John Doe",
    input: "text",
    autoComplete: "name",
    modes: ["signup"],
    column: "left",
  },
  {
    name: "email",
    label: "Email",
    description: "Enter your email address.",
    placeholder: "you@example.com",
    input: "email",
    autoComplete: "email",
    modes: ["signin", "signup"],
    column: "left",
  },
  {
    name: "password",
    label: "Password",
    description: "At least 8 characters.",
    placeholder: "Create a password",
    input: "password",
    autoComplete: "current-password",
    modes: ["signin", "signup"],
    column: "right",
  },
];

export function authFieldsForMode(
  authMode: AuthMode,
  column?: AuthSignUpColumn
): AuthFieldConfig[] {
  return authFieldConfigs.filter((field) => {
    if (!field.modes.includes(authMode)) {
      return false;
    }

    if (column === undefined) {
      return true;
    }

    return field.column === column;
  });
}

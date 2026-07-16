import type { UserTypeCreate } from "@vyrel/api/models/user/types/base.types";
import { createEdenClient } from "@/lib/eden-client";
import { getWebApiBaseURL } from "@/lib/web-api-base-url";

export type CreateAccountResult = { ok: true } | { ok: false; message: string };

function readErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "value" in error &&
    typeof error.value === "object" &&
    error.value !== null &&
    "message" in error.value &&
    typeof error.value.message === "string"
  ) {
    return error.value.message;
  }

  return "Unable to create account.";
}

export async function createAccount(
  input: UserTypeCreate
): Promise<CreateAccountResult> {
  const client = createEdenClient(undefined, getWebApiBaseURL());
  const { avatar, email, name, password } = input;

  const { error, status } = await client.api.users.post({
    email,
    name,
    password,
    ...(avatar === undefined ? {} : { avatar }),
  });

  if (error !== null || status >= 400) {
    return {
      message: readErrorMessage(error),
      ok: false,
    };
  }

  return { ok: true };
}

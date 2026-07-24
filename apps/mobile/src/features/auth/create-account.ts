import { getApiBaseURL } from "@/lib/api-base-url";
import { getSessionCookieHeaders } from "@/lib/session-cookie-headers";

export type CreateAccountResult = { ok: true } | { ok: false; message: string };

export type CreateAccountInput = {
  email: string;
  name: string;
  password: string;
};

function readErrorMessage(body: unknown): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof body.message === "string"
  ) {
    return body.message;
  }

  return "Unable to create account.";
}

export async function createAccount(
  input: CreateAccountInput
): Promise<CreateAccountResult> {
  let response: Response;

  try {
    response = await fetch(`${getApiBaseURL()}/api/users`, {
      body: JSON.stringify({
        email: input.email,
        name: input.name,
        password: input.password,
      }),
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        ...getSessionCookieHeaders(),
      },
      method: "POST",
    });
  } catch {
    return { message: "Unable to create account.", ok: false };
  }

  if (!response.ok) {
    let message = "Unable to create account.";
    try {
      message = readErrorMessage(await response.json());
    } catch {
      // ignore
    }
    return { message, ok: false };
  }

  return { ok: true };
}

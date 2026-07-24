import { getApiBaseURL } from "@/lib/api-base-url";
import { getSessionCookieHeaders } from "@/lib/session-cookie-headers";

export type CreateOrganizationResult =
  | { ok: true }
  | { ok: false; message: string };

export type CreateOrganizationInput = {
  name: string;
  slug: string;
};

export async function createOrganization(
  input: CreateOrganizationInput
): Promise<CreateOrganizationResult> {
  const formData = new FormData();
  formData.set("name", input.name);
  formData.set("slug", input.slug);

  let response: Response;

  try {
    response = await fetch(`${getApiBaseURL()}/api/organizations`, {
      body: formData,
      credentials: "omit",
      headers: getSessionCookieHeaders(),
      method: "POST",
    });
  } catch {
    return {
      message: "Unable to create organization.",
      ok: false,
    };
  }

  if (!response.ok) {
    let message = "Unable to create organization.";

    try {
      const body = (await response.json()) as { message?: string };
      if (typeof body.message === "string") {
        const { message: bodyMessage } = body;
        if (typeof bodyMessage === "string") {
          message = bodyMessage;
        }
      }
    } catch {
      // Response body was not JSON.
    }

    return {
      message,
      ok: false,
    };
  }

  return { ok: true };
}

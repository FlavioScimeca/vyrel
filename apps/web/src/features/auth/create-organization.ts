import type { OrganizationTypeCreate } from "@vyrel/api/models/organization/types/base.types";
import { getWebApiBaseURL } from "@/lib/web-api-base-url";

export type CreateOrganizationResult =
  | { ok: true }
  | { ok: false; message: string };

export async function createOrganization(
  input: OrganizationTypeCreate
): Promise<CreateOrganizationResult> {
  const formData = new FormData();
  formData.set("name", input.name);
  formData.set("slug", input.slug);

  if (input.logo !== undefined) {
    formData.set("logo", input.logo);
  }

  let response: Response;

  try {
    response = await fetch(`${getWebApiBaseURL()}/api/organizations`, {
      body: formData,
      credentials: "include",
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
      const { message: apiMessage } = body;
      if (typeof apiMessage === "string") {
        message = apiMessage;
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

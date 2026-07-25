const DEFAULT_SWITCH_ERROR = "Unable to switch organization.";

type SetActiveOrganization = (
  organizationId: string
) => Promise<{ error: { message?: string | null } | null }>;

export async function switchActiveOrganization({
  organizationId,
  refresh,
  setActiveOrganization,
}: {
  organizationId: string;
  refresh: () => void | Promise<void>;
  setActiveOrganization: SetActiveOrganization;
}): Promise<string | null> {
  try {
    const { error } = await setActiveOrganization(organizationId);

    if (error !== null) {
      return error.message ?? DEFAULT_SWITCH_ERROR;
    }

    await refresh();
    return null;
  } catch {
    return DEFAULT_SWITCH_ERROR;
  }
}

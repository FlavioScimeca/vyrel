import { useQuery } from "@apollo/client/react";
import { readFragment } from "gql.tada";
import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Spinner } from "@/src/components/ui/spinner";
import { OrganizationListItemFragment } from "@/src/features/dashboard/organization/graphql/fragments";
import { ListOrganizationsDocument } from "@/src/features/dashboard/organization/graphql/queries";
import { switchActiveOrganization } from "@/src/features/dashboard/organization/switch-active-organization";
import { authClient } from "@/src/lib/auth/auth-client";

type OrganizationSwitcherProps = {
  activeOrganizationId: string | null;
  onActiveOrganizationChange: () => void;
};

export function OrganizationSwitcher({
  activeOrganizationId,
  onActiveOrganizationChange,
}: OrganizationSwitcherProps) {
  const { data, loading, refetch } = useQuery(ListOrganizationsDocument);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const organizations = (data?.organizations ?? []).map((organization) =>
    readFragment(OrganizationListItemFragment, organization)
  );

  const active = organizations.find(
    (organization) => organization.id === activeOrganizationId
  );

  async function handleValueChange(organizationId: string | null) {
    if (
      organizationId === null ||
      organizationId === activeOrganizationId ||
      pending
    ) {
      return;
    }

    setPending(true);
    setError(null);

    const switchError = await switchActiveOrganization({
      organizationId,
      refresh: async () => {
        await refetch();
        onActiveOrganizationChange();
      },
      setActiveOrganization: async (nextOrganizationId) =>
        await authClient.organization.setActive({
          organizationId: nextOrganizationId,
        }),
    });

    setPending(false);

    if (switchError !== null) {
      setError(switchError);
    }
  }

  if (loading && data === undefined) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Spinner className="size-3.5" />
        Loading organizations…
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        No organizations yet. Create one on the web app first.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="font-medium text-sm">
        {active?.name ?? "Select organization"}
      </p>
      <Select
        disabled={pending}
        onValueChange={handleValueChange}
        value={activeOrganizationId}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose organization" />
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false}>
          {organizations.map((organization) => (
            <SelectItem key={organization.id} value={organization.id}>
              {organization.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending ? (
        <p className="text-muted-foreground text-xs">Switching…</p>
      ) : null}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}

import { useQuery } from "@apollo/client/react";
import { readFragment } from "gql.tada";
import { Button, Spinner, Surface, Typography } from "heroui-native";
import { Pressable, View } from "react-native";

import { OrganizationListItemFragment } from "@/features/dashboard/organization/graphql/fragments";
import { ListOrganizationsDocument } from "@/features/dashboard/organization/graphql/queries";
import { getActiveOrganizationId } from "@/lib/active-organization";
import { authClient } from "@/lib/auth-client";

export function OrganizationSwitcher() {
  const { data: session } = authClient.useSession();
  const activeOrganizationId = getActiveOrganizationId(session);
  const { data, loading, refetch } = useQuery(ListOrganizationsDocument);

  if (loading && data === undefined) {
    return <Spinner size="sm" />;
  }

  const organizations = data?.organizations ?? [];
  const active = organizations
    .map((org) => readFragment(OrganizationListItemFragment, org))
    .find((org) => org.id === activeOrganizationId);

  return (
    <View className="gap-2">
      <Typography className="font-medium text-sm">
        {active?.name ?? "Organization"}
      </Typography>
      <View className="gap-1">
        {organizations.map((organization) => {
          const org = readFragment(OrganizationListItemFragment, organization);
          const isActive = org.id === activeOrganizationId;
          return (
            <Pressable
              key={org.id}
              onPress={async () => {
                if (isActive) {
                  return;
                }
                await authClient.organization.setActive({
                  organizationId: org.id,
                });
                await refetch();
              }}
            >
              <Surface
                className="rounded-xl px-3 py-2"
                variant={isActive ? "default" : "secondary"}
              >
                <Typography className="text-sm">{org.name}</Typography>
                <Typography className="text-muted text-xs">
                  {org.slug}
                </Typography>
              </Surface>
            </Pressable>
          );
        })}
      </View>
      <Button onPress={() => refetch()} size="sm" variant="ghost">
        <Button.Label>Refresh</Button.Label>
      </Button>
    </View>
  );
}

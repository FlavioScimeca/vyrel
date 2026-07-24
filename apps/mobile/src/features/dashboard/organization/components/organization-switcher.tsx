import { useQuery } from "@apollo/client/react";
import { SymbolView } from "expo-symbols";
import { readFragment } from "gql.tada";
import {
  Avatar,
  BottomSheet,
  Button,
  Spinner,
  Typography,
  useThemeColor,
  useToast,
} from "heroui-native";
import { type ReactNode, useState } from "react";
import { Pressable, View } from "react-native";

import { OrganizationListItemFragment } from "@/features/dashboard/organization/graphql/fragments";
import { ListOrganizationsDocument } from "@/features/dashboard/organization/graphql/queries";
import { getActiveOrganizationId } from "@/lib/active-organization";
import { authClient } from "@/lib/auth-client";
import { haptics } from "@/lib/haptics";

export function OrganizationSwitcher() {
  const { data: session, refetch: refetchSession } = authClient.useSession();
  const activeOrganizationId = getActiveOrganizationId(session);
  const { data, loading, refetch } = useQuery(ListOrganizationsDocument);
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string>();
  const { toast } = useToast();
  const foreground = useThemeColor("foreground");

  const organizations = data?.organizations ?? [];
  const active = organizations
    .map((organization) =>
      readFragment(OrganizationListItemFragment, organization)
    )
    .find((organization) => organization.id === activeOrganizationId);

  return (
    <BottomSheet isOpen={open} onOpenChange={setOpen}>
      <BottomSheet.Trigger asChild>
        <Button
          accessibilityLabel={`Switch workspace. Current workspace: ${
            active?.name ?? "unknown"
          }`}
          className="h-12 rounded-2xl px-2"
          isIconOnly
          onPress={() => setOpen(true)}
          variant="secondary"
        >
          <Avatar alt={active?.name ?? "Workspace"} size="sm">
            {active?.imageThumb ? (
              <Avatar.Image source={{ uri: active.imageThumb }} />
            ) : null}
            <Avatar.Fallback>
              {(active?.name ?? "W").charAt(0).toUpperCase()}
            </Avatar.Fallback>
          </Avatar>
        </Button>
      </BottomSheet.Trigger>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content className="gap-5 pb-safe-offset-5">
          <BottomSheet.Close />
          <View className="gap-1 pr-10">
            <BottomSheet.Title>Switch workspace</BottomSheet.Title>
            <BottomSheet.Description>
              Your dashboard and tasks will update to the selected workspace.
            </BottomSheet.Description>
          </View>

          {loading && data === undefined ? (
            <View className="items-center py-6">
              <Spinner />
            </View>
          ) : (
            <View className="gap-2">
              {organizations.map((organization) => {
                const item = readFragment(
                  OrganizationListItemFragment,
                  organization
                );
                const isActive = item.id === activeOrganizationId;
                const isPending = item.id === pendingId;
                let statusIndicator: ReactNode = null;
                if (isPending) {
                  statusIndicator = <Spinner size="sm" />;
                } else if (isActive) {
                  statusIndicator = (
                    <SymbolView
                      name={{
                        android: "check_circle",
                        ios: "checkmark.circle.fill",
                        web: "check_circle",
                      }}
                      size={22}
                      tintColor={foreground}
                    />
                  );
                }

                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: isActive,
                      disabled: pendingId !== undefined,
                    }}
                    className={`min-h-16 flex-row items-center gap-3 rounded-2xl border px-3 ${
                      isActive
                        ? "border-accent bg-accent-soft"
                        : "border-transparent bg-surface-secondary"
                    }`}
                    disabled={pendingId !== undefined}
                    key={item.id}
                    onPress={async () => {
                      if (isActive) {
                        setOpen(false);
                        return;
                      }
                      setPendingId(item.id);
                      const { error } = await authClient.organization.setActive(
                        { organizationId: item.id }
                      );
                      if (error) {
                        haptics.danger();
                        toast.show({
                          label: error.message ?? "Unable to switch workspace.",
                          variant: "danger",
                        });
                        setPendingId(undefined);
                        return;
                      }
                      await Promise.all([refetch(), refetchSession()]);
                      haptics.success();
                      toast.show({
                        label: `Switched to ${item.name}`,
                        variant: "success",
                      });
                      setPendingId(undefined);
                      setOpen(false);
                    }}
                  >
                    <Avatar alt={item.name} size="sm">
                      {item.imageThumb ? (
                        <Avatar.Image source={{ uri: item.imageThumb }} />
                      ) : null}
                      <Avatar.Fallback>
                        {item.name.charAt(0).toUpperCase()}
                      </Avatar.Fallback>
                    </Avatar>
                    <View className="min-w-0 flex-1">
                      <Typography className="font-medium" numberOfLines={1}>
                        {item.name}
                      </Typography>
                      <Typography className="text-muted text-xs">
                        {item.slug}
                      </Typography>
                    </View>
                    {statusIndicator}
                  </Pressable>
                );
              })}
            </View>
          )}
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

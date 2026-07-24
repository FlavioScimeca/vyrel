import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
  Avatar,
  BottomSheet,
  Button,
  Chip,
  ListGroup,
  Separator,
  Typography,
  useThemeColor,
} from "heroui-native";
import type { ComponentProps, ReactNode } from "react";
import { useState } from "react";
import { Linking, ScrollView, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { OrganizationSwitcher } from "@/features/dashboard/organization/components/organization-switcher";
import { useThemePreference } from "@/features/preferences/theme-preference";
import { authClient } from "@/lib/auth-client";
import { APP_ORGANIZATION, APP_USER, AUTH_SIGN_IN } from "@/lib/routes";

type SymbolName = ComponentProps<typeof SymbolView>["name"];

export default function MoreIndexRoute() {
  const { data: session } = authClient.useSession();
  const { preference, setPreference } = useThemePreference();
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const user = session?.user;

  return (
    <View className="flex-1 bg-background">
      <AppHeader
        action={<OrganizationSwitcher />}
        eyebrow="Account"
        subtitle={user?.email}
        title={user?.name ?? "More"}
      />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-5 pb-10"
      >
        <View className="flex-row items-center gap-4 rounded-3xl bg-accent-soft p-4">
          <Avatar alt={user?.name ?? "User"} color="accent" size="lg">
            {user?.image ? <Avatar.Image source={{ uri: user.image }} /> : null}
            <Avatar.Fallback>
              {(user?.name ?? "U").charAt(0).toUpperCase()}
            </Avatar.Fallback>
          </Avatar>
          <View className="min-w-0 flex-1 gap-1">
            <Typography className="font-semibold text-lg" numberOfLines={1}>
              {user?.name ?? "Your profile"}
            </Typography>
            <Typography className="text-muted text-sm" numberOfLines={1}>
              {user?.email}
            </Typography>
          </View>
        </View>

        <SettingsSection label="Account">
          <SettingsItem
            description="Name, photo, security, and account"
            icon={{
              android: "person",
              ios: "person.crop.circle",
              web: "person",
            }}
            onPress={() => router.push(APP_USER)}
            title="Profile & security"
          />
          <Separator className="mx-4" />
          <SettingsItem
            description="Members, invitations, and details"
            icon={{
              android: "groups",
              ios: "person.3.fill",
              web: "groups",
            }}
            onPress={() => router.push(APP_ORGANIZATION)}
            title="Workspaces"
          />
        </SettingsSection>

        <SettingsSection label="Preferences">
          <SettingsItem
            description={`${preference.charAt(0).toUpperCase()}${preference.slice(
              1
            )}`}
            icon={{
              android: "palette",
              ios: "circle.lefthalf.filled",
              web: "palette",
            }}
            onPress={() => setAppearanceOpen(true)}
            title="Appearance"
          />
        </SettingsSection>

        <SettingsSection label="Help">
          <SettingsItem
            description="Contact the Vyrel team"
            icon={{
              android: "help",
              ios: "questionmark.circle",
              web: "help",
            }}
            onPress={() => Linking.openURL("mailto:support@vyrel.app")}
            title="Support"
          />
          <Separator className="mx-4" />
          <SettingsItem
            description="Version 1.0.0"
            icon={{ android: "info", ios: "info.circle", web: "info" }}
            title="About Vyrel"
          />
        </SettingsSection>

        <Button
          onPress={async () => {
            await authClient.signOut();
            router.replace(AUTH_SIGN_IN);
          }}
          size="lg"
          variant="danger-soft"
        >
          <Button.Label>Sign out</Button.Label>
        </Button>
      </ScrollView>

      <BottomSheet isOpen={appearanceOpen} onOpenChange={setAppearanceOpen}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content className="gap-5 pb-safe-offset-5">
            <BottomSheet.Close />
            <View className="gap-1 pr-10">
              <BottomSheet.Title>Appearance</BottomSheet.Title>
              <BottomSheet.Description>
                Choose a theme or follow your device.
              </BottomSheet.Description>
            </View>
            <View className="flex-row gap-2">
              {(["system", "light", "dark"] as const).map((option) => (
                <Chip
                  accessibilityState={{ selected: preference === option }}
                  className="flex-1 justify-center"
                  color={preference === option ? "accent" : "default"}
                  key={option}
                  onPress={async () => {
                    await setPreference(option);
                    setAppearanceOpen(false);
                  }}
                  size="lg"
                  variant="soft"
                >
                  <Chip.Label>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Chip.Label>
                </Chip>
              ))}
            </View>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    </View>
  );
}

function SettingsSection({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <View className="gap-2">
      <Typography className="ml-2 font-medium text-muted text-sm">
        {label}
      </Typography>
      <ListGroup variant="secondary">{children}</ListGroup>
    </View>
  );
}

function SettingsItem({
  description,
  icon,
  onPress,
  title,
}: {
  description: string;
  icon: SymbolName;
  onPress?: () => void;
  title: string;
}) {
  const foreground = useThemeColor("foreground");

  return (
    <ListGroup.Item
      accessibilityRole={onPress === undefined ? "text" : "button"}
      className="min-h-16"
      disabled={onPress === undefined}
      onPress={onPress}
    >
      <ListGroup.ItemPrefix>
        <View className="size-10 items-center justify-center rounded-2xl bg-default">
          <SymbolView name={icon} size={20} tintColor={foreground} />
        </View>
      </ListGroup.ItemPrefix>
      <ListGroup.ItemContent>
        <ListGroup.ItemTitle>{title}</ListGroup.ItemTitle>
        <ListGroup.ItemDescription>{description}</ListGroup.ItemDescription>
      </ListGroup.ItemContent>
      {onPress === undefined ? null : <ListGroup.ItemSuffix />}
    </ListGroup.Item>
  );
}

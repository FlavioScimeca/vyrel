import { Surface, Typography } from "heroui-native";
import { View } from "react-native";

import { OrganizationSwitcher } from "@/features/dashboard/organization/components/organization-switcher";
import { authClient } from "@/lib/auth-client";

export default function HomeRoute() {
  const { data: session } = authClient.useSession();

  return (
    <View className="flex-1 gap-4 bg-background p-4">
      <View className="gap-1">
        <Typography.Heading className="text-2xl">Home</Typography.Heading>
        <Typography.Paragraph>
          Welcome{session?.user.name ? `, ${session.user.name}` : ""}.
        </Typography.Paragraph>
      </View>

      <Surface className="gap-3 rounded-2xl p-4" variant="secondary">
        <Typography className="font-medium">Active organization</Typography>
        <OrganizationSwitcher />
      </Surface>
    </View>
  );
}

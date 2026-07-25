import { Typography } from "heroui-native";
import type { ReactNode } from "react";
import { View } from "react-native";

type AppHeaderProps = {
  action?: ReactNode;
  eyebrow?: string;
  subtitle?: string;
  title: string;
};

export function AppHeader({
  action,
  eyebrow,
  subtitle,
  title,
}: AppHeaderProps) {
  return (
    <View className="gap-3 px-5 pt-safe-offset-4 pb-3">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1">
          {eyebrow === undefined ? null : (
            <Typography className="font-medium text-accent text-sm">
              {eyebrow}
            </Typography>
          )}
          <Typography.Heading className="text-3xl">{title}</Typography.Heading>
          {subtitle === undefined ? null : (
            <Typography className="text-muted text-sm">{subtitle}</Typography>
          )}
        </View>
        {action}
      </View>
    </View>
  );
}

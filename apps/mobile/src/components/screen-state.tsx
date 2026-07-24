import { SymbolView } from "expo-symbols";
import {
  Button,
  SkeletonGroup,
  Typography,
  useThemeColor,
} from "heroui-native";
import type { ComponentProps } from "react";
import { View } from "react-native";

type EmptyStateProps = {
  actionLabel?: string;
  description: string;
  icon?: ComponentProps<typeof SymbolView>["name"];
  onAction?: () => void;
  title: string;
};

export function EmptyState({
  actionLabel,
  description,
  icon = { android: "inbox", ios: "tray", web: "inbox" },
  onAction,
  title,
}: EmptyStateProps) {
  const muted = useThemeColor("muted");

  return (
    <View className="items-center gap-3 px-8 py-14">
      <View className="size-14 items-center justify-center rounded-3xl bg-default">
        <SymbolView name={icon} size={26} tintColor={muted} />
      </View>
      <Typography.Heading className="text-center text-lg">
        {title}
      </Typography.Heading>
      <Typography className="max-w-sm text-center text-muted">
        {description}
      </Typography>
      {actionLabel === undefined || onAction === undefined ? null : (
        <Button onPress={onAction} variant="secondary">
          <Button.Label>{actionLabel}</Button.Label>
        </Button>
      )}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View accessibilityRole="alert" className="items-center gap-3 px-8 py-12">
      <Typography.Heading className="text-center text-lg">
        Something went wrong
      </Typography.Heading>
      <Typography className="text-center text-danger">{message}</Typography>
      <Button onPress={onRetry} variant="secondary">
        <Button.Label>Try again</Button.Label>
      </Button>
    </View>
  );
}

export function TaskListSkeleton() {
  return (
    <SkeletonGroup className="gap-3 px-5 py-3" isLoading isSkeletonOnly>
      {[0, 1, 2, 3].map((item) => (
        <View className="gap-3 rounded-3xl bg-surface-secondary p-4" key={item}>
          <View className="flex-row items-center gap-3">
            <SkeletonGroup.Item className="size-11 rounded-2xl" />
            <View className="flex-1 gap-2">
              <SkeletonGroup.Item className="h-4 w-3/4 rounded-lg" />
              <SkeletonGroup.Item className="h-3 w-1/2 rounded-lg" />
            </View>
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}

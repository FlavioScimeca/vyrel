import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Button, Typography, useThemeColor } from "heroui-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

type AuthScaffoldProps = {
  children: ReactNode;
  description: string;
  showBack?: boolean;
  title: string;
};

export function AuthScaffold({
  children,
  description,
  showBack = false,
  title,
}: AuthScaffoldProps) {
  const accentForeground = useThemeColor("accent-foreground");

  return (
    <KeyboardAwareScrollView
      bottomOffset={32}
      contentContainerStyle={styles.content}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
    >
      <View className="min-h-full justify-center gap-8 bg-background px-6 pt-safe-offset-6 pb-safe-offset-8">
        <View className="gap-7">
          <View className="flex-row items-center justify-between">
            {showBack ? (
              <Button
                accessibilityLabel="Go back"
                className="size-12 rounded-2xl"
                isIconOnly
                onPress={() => router.back()}
                variant="secondary"
              >
                <SymbolView
                  name={{
                    android: "arrow_back",
                    ios: "chevron.left",
                    web: "arrow_back",
                  }}
                  size={20}
                />
              </Button>
            ) : (
              <View
                accessibilityLabel="Vyrel"
                className="size-12 items-center justify-center rounded-2xl bg-accent"
              >
                <Typography className="font-semibold text-accent-foreground text-xl">
                  V
                </Typography>
              </View>
            )}
            <View className="size-12 items-center justify-center rounded-2xl bg-accent">
              <SymbolView
                name={{
                  android: "check_circle",
                  ios: "checkmark.circle.fill",
                  web: "check_circle",
                }}
                size={24}
                tintColor={accentForeground}
              />
            </View>
          </View>

          <View className="gap-2">
            <Typography.Heading className="text-4xl">
              {title}
            </Typography.Heading>
            <Typography className="max-w-sm text-base text-muted">
              {description}
            </Typography>
          </View>
        </View>

        {children}

        <Typography className="text-center text-muted text-xs">
          Calm work, clearly organized.
        </Typography>
      </View>
    </KeyboardAwareScrollView>
  );
}

export function AuthTextLink({
  children,
  onPress,
}: {
  children: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className="min-h-11 items-center justify-center rounded-xl px-3"
      onPress={onPress}
    >
      {children}
    </Pressable>
  );
}

export function FormAlert({ message }: { message?: string }) {
  if (message === undefined) {
    return null;
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      className="rounded-2xl bg-danger-soft p-4"
    >
      <Typography className="text-danger-soft-foreground text-sm">
        {message}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
});

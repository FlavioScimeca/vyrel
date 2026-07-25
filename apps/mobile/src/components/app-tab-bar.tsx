import type { BottomTabBarProps } from "expo-router/build/layouts/Tabs";
import { SymbolView } from "expo-symbols";
import { Typography, useThemeColor } from "heroui-native";
import type { ComponentProps } from "react";
import { Pressable, View } from "react-native";
import { useKeyboardState } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { haptics } from "@/lib/haptics";

type SymbolName = ComponentProps<typeof SymbolView>["name"];

const TAB_ICONS: Record<string, SymbolName> = {
  home: { android: "home", ios: "house.fill", web: "home" },
  more: {
    android: "more_horiz",
    ios: "ellipsis.circle.fill",
    web: "more_horiz",
  },
  tasks: { android: "checklist", ios: "checklist", web: "checklist" },
};

export function AppTabBar({
  descriptors,
  navigation,
  state,
}: BottomTabBarProps) {
  const isKeyboardVisible = useKeyboardState(
    (keyboardState) => keyboardState.isVisible
  );
  const insets = useSafeAreaInsets();
  const accent = useThemeColor("accent");
  const muted = useThemeColor("muted");

  if (isKeyboardVisible) {
    return null;
  }

  return (
    <View
      className="border-separator border-t bg-surface px-3 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 10) }}
    >
      <View className="flex-row rounded-3xl bg-surface-secondary p-1">
        {state.routes.map((route, index) => {
          const descriptor = descriptors[route.key];
          const isSelected = state.index === index;
          const label =
            typeof descriptor.options.tabBarLabel === "string"
              ? descriptor.options.tabBarLabel
              : (descriptor.options.title ?? route.name);

          const onPress = () => {
            const event = navigation.emit({
              canPreventDefault: true,
              target: route.key,
              type: "tabPress",
            });

            if (!(isSelected || event.defaultPrevented)) {
              haptics.selection();
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              accessibilityLabel={descriptor.options.tabBarAccessibilityLabel}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              className={`min-h-14 flex-1 items-center justify-center gap-1 rounded-[20px] ${
                isSelected ? "bg-accent-soft" : ""
              }`}
              key={route.key}
              onLongPress={() =>
                navigation.emit({
                  target: route.key,
                  type: "tabLongPress",
                })
              }
              onPress={onPress}
            >
              <SymbolView
                name={TAB_ICONS[route.name] ?? TAB_ICONS.more}
                size={21}
                tintColor={isSelected ? accent : muted}
              />
              <Typography
                className={`font-medium text-xs ${
                  isSelected ? "text-accent" : "text-muted"
                }`}
              >
                {label}
              </Typography>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

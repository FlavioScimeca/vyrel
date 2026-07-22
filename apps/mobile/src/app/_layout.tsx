import "@/global.css";

import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { preventAutoHideAsync } from "expo-splash-screen";
import { HeroUINativeProvider } from "heroui-native";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";

preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <HeroUINativeProvider
          config={{ devInfo: { stylingPrinciples: false } }}
        >
          <AnimatedSplashOverlay />
          <AppTabs />
        </HeroUINativeProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

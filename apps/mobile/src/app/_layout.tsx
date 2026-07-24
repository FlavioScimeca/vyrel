import "@/global.css";

import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from "expo-router";
import { hideAsync, preventAutoHideAsync } from "expo-splash-screen";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ApolloProvider } from "@/graphql/apollo/provider";

preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    hideAsync().catch(() => undefined);
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <HeroUINativeProvider
          config={{
            devInfo: { stylingPrinciples: false },
            toast: true,
          }}
        >
          <ApolloProvider>
            <Slot />
          </ApolloProvider>
        </HeroUINativeProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

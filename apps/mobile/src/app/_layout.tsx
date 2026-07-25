import "@/global.css";

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from "expo-router";
import { hideAsync, preventAutoHideAsync } from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { type HeroUINativeConfig, HeroUINativeProvider } from "heroui-native";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { ConnectivityBanner } from "@/components/connectivity-banner";
import {
  ThemePreferenceProvider,
  useThemePreference,
} from "@/features/preferences/theme-preference";
import { AppLockProvider } from "@/features/security/app-lock";
import { ApolloProvider } from "@/graphql/apollo/provider";

preventAutoHideAsync().catch(() => undefined);

const heroConfig: HeroUINativeConfig = {
  devInfo: { stylingPrinciples: false },
  textInputProps: {
    allowFontScaling: true,
    maxFontSizeMultiplier: 2,
  },
  textProps: {
    allowFontScaling: true,
    maxFontSizeMultiplier: 2,
  },
  toast: {
    defaultProps: {
      isSwipeable: true,
      placement: "top",
    },
    maxVisibleToasts: 2,
  },
};

function ThemedApplication() {
  const { resolvedTheme } = useThemePreference();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError !== null) {
      hideAsync().catch(() => undefined);
    }
  }, [fontError, fontsLoaded]);

  if (!(fontsLoaded || fontError !== null)) {
    return null;
  }

  return (
    <ThemeProvider value={resolvedTheme === "dark" ? DarkTheme : DefaultTheme}>
      {/* Apollo above HeroUI so PortalHost (BottomSheets) inherits the client. */}
      <ApolloProvider>
        <HeroUINativeProvider config={heroConfig}>
          <AppLockProvider>
            <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
            <ConnectivityBanner />
            <Slot />
          </AppLockProvider>
        </HeroUINativeProvider>
      </ApolloProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <ThemePreferenceProvider>
          <ThemedApplication />
        </ThemePreferenceProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

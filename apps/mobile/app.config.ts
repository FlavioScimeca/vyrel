import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "mobile",
  slug: "mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon-generic/logo.png",
  scheme: "mobile",
  userInterfaceStyle: "automatic",
  ios: {
    icon: "./assets/expo.icon",
    bundleIdentifier: "com.flavio-scimeca.mobile",
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#f2f2f2",
      foregroundImage: "./assets/icon-android/logo.png",
      backgroundImage: "./assets/icon-android/logo.png",
      monochromeImage: "./assets/icon-android/logo.png",
    },
    predictiveBackGestureEnabled: false,
    package: "com.flavio_scimeca.mobile",
  },
  web: {
    output: "static",
    favicon: "./assets/icon-web/logo.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#208AEF",
        image: "./assets/images/splash-icon.png",
        imageWidth: 76,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;

import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Vyrel",
  slug: "vyrel-mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon-generic/logo.png",
  scheme: "vyrel-mobile",
  userInterfaceStyle: "automatic",
  ios: {
    icon: "./assets/expo.icon",
    bundleIdentifier: "com.flavio-scimeca.vyrel-mobile",
    infoPlist: {
      NSFaceIDUsageDescription:
        "Use Face ID to unlock Vyrel and protect your workspace.",
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#f2f2f2",
      foregroundImage: "./assets/icon-android/logo.png",
      backgroundImage: "./assets/icon-android/logo.png",
      monochromeImage: "./assets/icon-android/logo.png",
    },
    predictiveBackGestureEnabled: false,
    package: "com.flavio_scimeca.vyrel_mobile",
    softwareKeyboardLayoutMode: "pan",
  },
  web: {
    output: "static",
    favicon: "./assets/icon-web/logo.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-local-authentication",
    [
      "expo-image-picker",
      {
        photosPermission:
          "Allow Vyrel to access your photos for task and profile images.",
      },
    ],
    [
      "expo-splash-screen",
      {
        backgroundColor: "#111111",
        image: "./assets/images/splash-icon.png",
        imageWidth: 76,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: "2e001335-1ccd-4f1f-afbf-954b1efeb8af",
    },
  },
};

export default config;

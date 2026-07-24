import { useNetworkState } from "expo-network";
import { Typography } from "heroui-native";
import { View } from "react-native";

export function ConnectivityBanner() {
  const network = useNetworkState();
  const isOffline =
    network.isConnected === false || network.isInternetReachable === false;

  if (!isOffline) {
    return null;
  }

  return (
    <View accessibilityLiveRegion="polite" className="bg-warning px-4 py-2">
      <Typography className="text-center text-sm text-warning-foreground">
        You’re offline. Changes are paused until your connection returns.
      </Typography>
    </View>
  );
}

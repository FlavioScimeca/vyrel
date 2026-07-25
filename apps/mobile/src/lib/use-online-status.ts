import { useNetworkState } from "expo-network";

export const useIsOnline = (): boolean => {
  const network = useNetworkState();
  return network.isConnected !== false && network.isInternetReachable !== false;
};

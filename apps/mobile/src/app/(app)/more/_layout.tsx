import { Stack } from "expo-router";

export default function MoreLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "More" }} />
      <Stack.Screen name="user" options={{ title: "Profile" }} />
      <Stack.Screen name="organization" options={{ title: "Organizations" }} />
    </Stack>
  );
}

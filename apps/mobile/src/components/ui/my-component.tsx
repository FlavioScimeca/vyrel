import { Button } from "heroui-native";
import { View } from "react-native";

export default function MyComponent() {
  return (
    <View className="h-16 items-center justify-center bg-red-500">
      <Button onPress={() => console.log("Pressed!")}>Get Started</Button>
    </View>
  );
}

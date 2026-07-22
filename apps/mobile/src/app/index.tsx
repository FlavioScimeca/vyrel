import { Button, Surface, Typography } from "heroui-native";
import { View } from "react-native";
export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center">
      <Surface variant="default">
        <Surface variant="secondary">
          <Typography.Heading
            className="font-bold text-2xl text-amber-200"
            color="muted"
          >
            Hello World
          </Typography.Heading>
        </Surface>
        <Button>Click me</Button>
      </Surface>
    </View>
  );
}

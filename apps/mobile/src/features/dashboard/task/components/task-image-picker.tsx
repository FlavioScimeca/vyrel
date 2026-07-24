import {
  launchImageLibraryAsync,
  requestMediaLibraryPermissionsAsync,
} from "expo-image-picker";
import { Button, Typography } from "heroui-native";
import { View } from "react-native";

export type PickedImage = {
  name: string;
  type: string;
  uri: string;
};

type TaskImagePickerProps = {
  onChange: (image: PickedImage | undefined) => void;
  value?: PickedImage;
};

export function TaskImagePicker({ onChange, value }: TaskImagePickerProps) {
  return (
    <View className="gap-2">
      <Typography className="font-medium text-sm">Image</Typography>
      {value === undefined ? null : (
        <Typography className="text-muted text-xs" numberOfLines={1}>
          {value.name}
        </Typography>
      )}
      <View className="flex-row gap-2">
        <Button
          onPress={async () => {
            const permission = await requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              return;
            }

            const result = await launchImageLibraryAsync({
              mediaTypes: ["images"],
              quality: 0.8,
            });

            if (result.canceled) {
              return;
            }

            const [asset] = result.assets;
            if (asset === undefined) {
              return;
            }

            onChange({
              name: asset.fileName ?? "task-image.jpg",
              type: asset.mimeType ?? "image/jpeg",
              uri: asset.uri,
            });
          }}
          size="sm"
          variant="secondary"
        >
          <Button.Label>
            {value === undefined ? "Pick image" : "Change"}
          </Button.Label>
        </Button>
        {value === undefined ? null : (
          <Button onPress={() => onChange(undefined)} size="sm" variant="ghost">
            <Button.Label>Remove</Button.Label>
          </Button>
        )}
      </View>
    </View>
  );
}

/** React Native multipart file shape accepted by apollo-upload-client. */
export function toUploadFile(image: PickedImage): {
  name: string;
  type: string;
  uri: string;
} {
  return {
    name: image.name,
    type: image.type,
    uri: image.uri,
  };
}

import { Image } from "expo-image";
import {
  launchImageLibraryAsync,
  requestMediaLibraryPermissionsAsync,
} from "expo-image-picker";
import { Button, Typography } from "heroui-native";
import { useState } from "react";
import { Linking, View } from "react-native";

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
  const [permissionDenied, setPermissionDenied] = useState(false);

  return (
    <View className="gap-3">
      <Typography className="font-medium text-sm">Image</Typography>
      {value === undefined ? (
        <View className="h-28 items-center justify-center rounded-2xl border border-field-border border-dashed bg-surface-secondary">
          <Typography className="text-muted text-sm">
            Add a visual reference
          </Typography>
        </View>
      ) : (
        <View className="gap-2">
          <Image
            accessibilityLabel="Selected task image preview"
            className="h-40 w-full rounded-2xl"
            contentFit="cover"
            source={{ uri: value.uri }}
          />
          <Typography className="text-muted text-xs" numberOfLines={1}>
            {value.name}
          </Typography>
        </View>
      )}
      {permissionDenied ? (
        <View
          accessibilityRole="alert"
          className="gap-2 rounded-2xl bg-warning-soft p-3"
        >
          <Typography className="text-sm text-warning-soft-foreground">
            Photo access is disabled. Allow it in device settings to attach an
            image.
          </Typography>
          <Button
            onPress={() => Linking.openSettings()}
            size="sm"
            variant="secondary"
          >
            <Button.Label>Open settings</Button.Label>
          </Button>
        </View>
      ) : null}
      <View className="flex-row gap-2">
        <Button
          onPress={async () => {
            const permission = await requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              setPermissionDenied(true);
              return;
            }
            setPermissionDenied(false);

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
            {value === undefined ? "Choose image" : "Replace image"}
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

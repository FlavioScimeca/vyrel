import { useMutation, useQuery } from "@apollo/client/react";
import {
  launchImageLibraryAsync,
  requestMediaLibraryPermissionsAsync,
} from "expo-image-picker";
import { router } from "expo-router";
import { readFragment } from "gql.tada";
import {
  Avatar,
  BottomSheet,
  Button,
  Chip,
  Dialog,
  Input,
  Label,
  ListGroup,
  Separator,
  Spinner,
  Switch,
  TextField,
  Typography,
  useToast,
} from "heroui-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { ErrorState } from "@/components/screen-state";
import {
  UserProfileFragment,
  type UserProfileRef,
} from "@/features/dashboard/user/graphql/fragments";
import {
  DeleteUserDocument,
  UpdateUserDocument,
} from "@/features/dashboard/user/graphql/mutations";
import { GetUserDocument } from "@/features/dashboard/user/graphql/queries";
import { useAppLock } from "@/features/security/app-lock";
import { authClient } from "@/lib/auth-client";
import { formatMediumDate } from "@/lib/format-date";
import { haptics } from "@/lib/haptics";
import { AUTH_SIGN_IN } from "@/lib/routes";

type PickedAvatar = {
  name: string;
  type: string;
  uri: string;
};

function EditProfileSheet({ user }: { user: UserProfileRef }) {
  const profile = readFragment(UserProfileFragment, user);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState<PickedAvatar>();
  const [updateUser, { loading }] = useMutation(UpdateUserDocument);
  const { toast } = useToast();

  return (
    <BottomSheet isOpen={open} onOpenChange={setOpen}>
      <BottomSheet.Trigger asChild>
        <Button onPress={() => setOpen(true)} variant="secondary">
          <Button.Label>Edit profile</Button.Label>
        </Button>
      </BottomSheet.Trigger>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content className="gap-5 pb-safe-offset-5" keyboardBehavior="extend">
          <BottomSheet.Close />
          <View className="gap-1 pr-10">
            <BottomSheet.Title>Edit profile</BottomSheet.Title>
            <BottomSheet.Description>
              This name and photo are visible to workspace members.
            </BottomSheet.Description>
          </View>
          <View className="items-center gap-3">
            <Avatar alt={name || profile.name} color="accent" size="lg">
              {avatar?.uri || profile.imageThumb ? (
                <Avatar.Image
                  source={{ uri: avatar?.uri ?? profile.imageThumb ?? "" }}
                />
              ) : null}
              <Avatar.Fallback>
                {(name || profile.name).charAt(0).toUpperCase()}
              </Avatar.Fallback>
            </Avatar>
            <View className="flex-row gap-2">
              <Button
                onPress={async () => {
                  const permission =
                    await requestMediaLibraryPermissionsAsync();
                  if (!permission.granted) {
                    toast.show({
                      label: "Photo access is required to choose an avatar.",
                      variant: "warning",
                    });
                    return;
                  }
                  const result = await launchImageLibraryAsync({
                    allowsEditing: true,
                    aspect: [1, 1],
                    mediaTypes: ["images"],
                    quality: 0.85,
                  });
                  if (!result.canceled && result.assets[0] !== undefined) {
                    const asset = result.assets[0];
                    setAvatar({
                      name: asset.fileName ?? "avatar.jpg",
                      type: asset.mimeType ?? "image/jpeg",
                      uri: asset.uri,
                    });
                  }
                }}
                size="sm"
                variant="secondary"
              >
                <Button.Label>Choose photo</Button.Label>
              </Button>
              {avatar === undefined ? null : (
                <Button
                  onPress={() => setAvatar(undefined)}
                  size="sm"
                  variant="tertiary"
                >
                  <Button.Label>Remove</Button.Label>
                </Button>
              )}
            </View>
          </View>
          <TextField isInvalid={name.trim().length === 0} isRequired>
            <Label>Name</Label>
            <Input
              autoComplete="name"
              onChangeText={setName}
              returnKeyType="done"
              value={name}
            />
          </TextField>
          <Button
            isDisabled={loading || name.trim().length === 0}
            onPress={async () => {
              try {
                await updateUser({
                  refetchQueries: [GetUserDocument],
                  variables: {
                    input: {
                      avatar:
                        avatar === undefined
                          ? undefined
                          : {
                              name: avatar.name,
                              type: avatar.type,
                              uri: avatar.uri,
                            },
                      name: name.trim(),
                    },
                  },
                });
                haptics.success();
                toast.show({ label: "Profile updated", variant: "success" });
                setOpen(false);
              } catch (error) {
                haptics.danger();
                toast.show({
                  label:
                    error instanceof Error
                      ? error.message
                      : "Unable to update profile.",
                  variant: "danger",
                });
              }
            }}
            size="lg"
          >
            {loading ? <Spinner color="default" size="sm" /> : null}
            <Button.Label>{loading ? "Saving profile…" : "Save profile"}</Button.Label>
          </Button>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [deleteUser, { loading }] = useMutation(DeleteUserDocument);
  const { toast } = useToast();

  return (
    <Dialog isOpen={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button onPress={() => setOpen(true)} variant="danger-soft">
          <Button.Label>Delete account</Button.Label>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content className="gap-4">
          <Dialog.Close />
          <Dialog.Title>Delete your account?</Dialog.Title>
          <Dialog.Description>
            This permanently removes your account. Enter your password to
            confirm.
          </Dialog.Description>
          <TextField isRequired>
            <Label>Password</Label>
            <Input
              autoComplete="current-password"
              onChangeText={setPassword}
              secureTextEntry
              value={password}
            />
          </TextField>
          <Button
            isDisabled={loading || password.length < 8}
            onPress={async () => {
              try {
                await deleteUser({
                  variables: { input: { password } },
                });
                haptics.success();
                await authClient.signOut();
                router.replace(AUTH_SIGN_IN);
              } catch (error) {
                haptics.danger();
                toast.show({
                  label:
                    error instanceof Error
                      ? error.message
                      : "Unable to delete account.",
                  variant: "danger",
                });
              }
            }}
            variant="danger"
          >
            {loading ? <Spinner color="default" size="sm" /> : null}
            <Button.Label>
              {loading ? "Deleting account…" : "Delete account permanently"}
            </Button.Label>
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

export function ManageUserScreen() {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  const { isAvailable, settings, updateEnabled } = useAppLock();
  const { toast } = useToast();
  const { data, error, loading, refetch } = useQuery(GetUserDocument, {
    skip: userId === undefined,
    variables: { id: userId ?? "" },
  });

  if (loading && data === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }
  if (error !== undefined) {
    return (
      <View className="flex-1 bg-background">
        <ErrorState message={error.message} onRetry={refetch} />
      </View>
    );
  }
  if (data?.user == null) {
    return null;
  }

  const profile = readFragment(UserProfileFragment, data.user);
  const imageSrc = profile.imageThumb ?? profile.imageFull;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-6 p-5 pb-safe-offset-10"
      keyboardShouldPersistTaps="handled"
    >
      <View className="items-center gap-3">
        <Avatar alt={profile.name} color="accent" size="lg">
          {imageSrc ? <Avatar.Image source={{ uri: imageSrc }} /> : null}
          <Avatar.Fallback>
            {profile.name.charAt(0).toUpperCase()}
          </Avatar.Fallback>
        </Avatar>
        <View className="items-center gap-1">
          <Typography.Heading className="text-2xl">
            {profile.name}
          </Typography.Heading>
          <Typography className="text-muted">{profile.email}</Typography>
          <Chip
            color={profile.emailVerified ? "success" : "warning"}
            size="sm"
            variant="soft"
          >
            <Chip.Label>
              {profile.emailVerified ? "Email verified" : "Email not verified"}
            </Chip.Label>
          </Chip>
        </View>
        <EditProfileSheet user={data.user} />
      </View>

      <View className="gap-2">
        <Typography className="ml-2 font-medium text-muted text-sm">
          Security
        </Typography>
        <ListGroup variant="secondary">
          <ListGroup.Item
            accessibilityState={{
              checked: settings.enabled,
              disabled: !isAvailable,
            }}
            className="min-h-16"
            onPress={async () => {
              const changed = await updateEnabled(!settings.enabled);
              if (!changed) {
                toast.show({
                  label: isAvailable
                    ? "Authentication was cancelled."
                    : "Biometrics are not available or enrolled.",
                  variant: "warning",
                });
              }
            }}
          >
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>App Lock</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                {isAvailable
                  ? "Lock after 30 seconds in the background"
                  : "Biometrics are unavailable on this device"}
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <Switch
                accessibilityLabel="App Lock"
                isDisabled={!isAvailable}
                isSelected={settings.enabled}
                pointerEvents="none"
              />
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
        </ListGroup>
      </View>

      <View className="gap-2">
        <Typography className="ml-2 font-medium text-muted text-sm">
          Account information
        </Typography>
        <ListGroup variant="secondary">
          <InfoItem label="Email" value={profile.email} />
          <Separator className="mx-4" />
          <InfoItem
            label="Member since"
            value={formatMediumDate(profile.createdAt)}
          />
        </ListGroup>
      </View>

      <View className="gap-3 rounded-3xl bg-danger-soft p-5">
        <View className="gap-1">
          <Typography className="font-semibold text-danger-soft-foreground">
            Danger zone
          </Typography>
          <Typography className="text-danger-soft-foreground text-sm">
            Account deletion is permanent and requires your password.
          </Typography>
        </View>
        <DeleteAccountDialog />
      </View>
    </ScrollView>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <ListGroup.Item disabled>
      <ListGroup.ItemContent>
        <ListGroup.ItemTitle>{label}</ListGroup.ItemTitle>
        <ListGroup.ItemDescription>{value}</ListGroup.ItemDescription>
      </ListGroup.ItemContent>
    </ListGroup.Item>
  );
}

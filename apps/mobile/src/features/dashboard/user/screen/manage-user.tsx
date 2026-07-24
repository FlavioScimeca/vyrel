import { useQuery } from "@apollo/client/react";
import { Image } from "expo-image";
import { readFragment } from "gql.tada";
import { Chip, Spinner, Surface, Typography } from "heroui-native";
import { ScrollView, View } from "react-native";

import {
  UserProfileFragment,
  type UserProfileRef,
} from "@/features/dashboard/user/graphql/fragments";
import { GetUserDocument } from "@/features/dashboard/user/graphql/queries";
import { authClient } from "@/lib/auth-client";
import { formatMediumDate } from "@/lib/format-date";

function UserProfileCard({ user }: { user: UserProfileRef }) {
  const profile = readFragment(UserProfileFragment, user);
  const imageSrc = profile.imageThumb ?? profile.imageFull;

  return (
    <Surface className="gap-4 rounded-2xl p-4" variant="secondary">
      <View className="flex-row items-center gap-3">
        {imageSrc !== null && imageSrc.length > 0 ? (
          <Image
            className="size-14 rounded-xl"
            contentFit="cover"
            source={{ uri: imageSrc }}
          />
        ) : (
          <View className="size-14 items-center justify-center rounded-xl bg-default">
            <Typography className="font-semibold text-lg">
              {profile.name.charAt(0).toUpperCase()}
            </Typography>
          </View>
        )}
        <View className="min-w-0 flex-1 gap-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Typography className="font-semibold text-base">
              {profile.name}
            </Typography>
            <Chip
              color={profile.emailVerified ? "success" : "default"}
              size="sm"
              variant="soft"
            >
              <Chip.Label>
                {profile.emailVerified ? "Verified" : "Unverified"}
              </Chip.Label>
            </Chip>
          </View>
          <Typography className="text-muted text-sm">
            {profile.email}
          </Typography>
        </View>
      </View>
      <Typography className="text-muted text-xs">
        Joined {formatMediumDate(profile.createdAt)}
      </Typography>
    </Surface>
  );
}

export function ManageUserScreen() {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;

  const { data, error, loading } = useQuery(GetUserDocument, {
    skip: userId === undefined,
    variables: { id: userId ?? "" },
  });

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-4 p-4 pb-10"
    >
      <View className="gap-1">
        <Typography.Heading className="text-2xl">Profile</Typography.Heading>
        <Typography.Paragraph>
          Your account details for this workspace.
        </Typography.Paragraph>
      </View>

      {loading ? (
        <View className="items-center py-10">
          <Spinner />
        </View>
      ) : null}

      {error === undefined ? null : (
        <Typography className="text-danger">
          Unable to load your profile.
        </Typography>
      )}

      {data?.user !== null && data?.user !== undefined ? (
        <UserProfileCard user={data.user} />
      ) : null}
    </ScrollView>
  );
}

"use client";

import { useQuery } from "@apollo/client/react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { UserProfile } from "@/features/dashboard/user/components/user-profile";
import { GetUserDocument } from "@/features/dashboard/user/graphql/queries";
import { authClient } from "@/lib/auth-client";

export default function ManageUser() {
  const { data: sessionData, isPending: sessionPending } =
    authClient.useSession();
  const userId = sessionData?.user.id ?? null;

  const { data, error, loading } = useQuery(GetUserDocument, {
    skip: userId === null || userId.length === 0,
    variables: {
      id: userId ?? "",
    },
  });

  const isLoading = sessionPending || (userId !== null && loading);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl tracking-tight">User</h1>
        <p className="text-muted-foreground text-sm">
          View your account profile.
        </p>
      </header>

      {userId === null || userId.length === 0 ? (
        <Alert>
          <AlertDescription>
            Sign in to view your profile information.
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : null}

      {!isLoading &&
      userId !== null &&
      userId.length > 0 &&
      error !== undefined ? (
        <Alert variant="destructive">
          <AlertDescription>
            Unable to load your profile. Please try again.
          </AlertDescription>
        </Alert>
      ) : null}

      {!isLoading &&
      userId !== null &&
      userId.length > 0 &&
      error === undefined ? (
        <UserProfile user={data?.user} />
      ) : null}
    </div>
  );
}

"use client";

import { useSuspenseQuery } from "@apollo/client/react";
import { Alert, AlertDescription } from "@vyrel/shared/ui";
import { UserProfile } from "@/features/dashboard/user/components/user-profile";
import { GetUserDocument } from "@/features/dashboard/user/graphql/queries";

type ManageUserProps = {
  initialUserId: string | null;
};

export default function ManageUser({ initialUserId }: ManageUserProps) {
  if (initialUserId === null || initialUserId.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <header className="space-y-1">
          <h1 className="font-heading text-2xl tracking-tight">User</h1>
          <p className="text-muted-foreground text-sm">
            View your account profile.
          </p>
        </header>
        <Alert>
          <AlertDescription>
            Sign in to view your profile information.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <ManageUserWithId userId={initialUserId} />;
}

function ManageUserWithId({ userId }: { userId: string }) {
  const { data, error } = useSuspenseQuery(GetUserDocument, {
    variables: { id: userId },
  });
  const { user } = data;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl tracking-tight">User</h1>
        <p className="text-muted-foreground text-sm">
          View your account profile.
        </p>
      </header>

      {error === undefined ? (
        <UserProfile user={user} />
      ) : (
        <Alert variant="destructive">
          <AlertDescription>
            Unable to load your profile. Please try again.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

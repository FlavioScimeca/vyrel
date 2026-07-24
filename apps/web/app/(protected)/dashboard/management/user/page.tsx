import { redirect } from "next/navigation";
import { Suspense } from "react";

import { UserProfileSkeleton } from "@/features/dashboard/user/components/user-profile-skeleton";
import { GetUserDocument } from "@/features/dashboard/user/graphql/queries";
import ManageUser from "@/features/dashboard/user/screen/manage-user";
import { PreloadQuery } from "@/graphql/apollo/client";
import { getServerAuthState } from "@/lib/server-session";

export default async function ManagementUserPage() {
  const authState = await getServerAuthState();
  const userId = authState?.user.id;

  if (userId === undefined) {
    redirect("/auth");
  }

  return (
    <PreloadQuery query={GetUserDocument} variables={{ id: userId }}>
      <Suspense fallback={<UserProfileSkeleton />}>
        <ManageUser initialUserId={userId} />
      </Suspense>
    </PreloadQuery>
  );
}

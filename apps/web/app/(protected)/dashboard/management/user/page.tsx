import { Suspense } from "react";

import { UserProfileSkeleton } from "@/features/dashboard/user/components/user-profile-skeleton";
import { GetUserDocument } from "@/features/dashboard/user/graphql/queries";
import ManageUser from "@/features/dashboard/user/screen/manage-user";
import { PreloadQuery } from "@/graphql/apollo/client";
import { getServerSession } from "@/lib/server-session";

export default async function ManagementUserPage() {
  const session = await getServerSession();
  const userId = session?.user?.id ?? null;

  if (userId === null || userId.length === 0) {
    return <ManageUser initialUserId={null} />;
  }

  return (
    <PreloadQuery query={GetUserDocument} variables={{ id: userId }}>
      <Suspense fallback={<UserProfileSkeleton />}>
        <ManageUser initialUserId={userId} />
      </Suspense>
    </PreloadQuery>
  );
}

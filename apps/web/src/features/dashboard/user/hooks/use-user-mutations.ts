"use client";

import {
  useOptimisticDelete,
  useOptimisticUpdate,
} from "@vyrel/graphql-client";
import { toast } from "@vyrel/shared/ui";
import {
  DeleteUserDocument,
  UpdateUserDocument,
} from "@/features/dashboard/user/graphql/mutations";
import type { OptimisticUserExisting } from "@/features/dashboard/user/graphql/types";

export function useUpdateUserMutation(existingUser: OptimisticUserExisting) {
  return useOptimisticUpdate(UpdateUserDocument, {
    current: existingUser,
    onCompleted: () => {
      toast.success("Profile updated");
    },
    onError: (error) => {
      toast.error(error.message || "Unable to update profile.");
    },
    optimistic: (variables) => ({
      name: variables.input.name ?? existingUser.name,
    }),
  });
}

/** Pass the immutable User cache identity generated from the schema. */
export function useDeleteUserMutation(userId: string) {
  return useOptimisticDelete(DeleteUserDocument, {
    id: () => userId,
    onCompleted: () => {
      toast.success("Account deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Unable to delete account.");
    },
  });
}

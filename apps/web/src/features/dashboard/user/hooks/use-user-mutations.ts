"use client";

import {
  useOptimisticDelete,
  useOptimisticUpdate,
} from "@vyrel/graphql-client";
import { toast } from "sonner";
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

/** Cache key for User is `email`; pass the current email for eviction. */
export function useDeleteUserMutation(userEmail: string) {
  return useOptimisticDelete(DeleteUserDocument, {
    id: () => userEmail,
    onCompleted: () => {
      toast.success("Account deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Unable to delete account.");
    },
  });
}

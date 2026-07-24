import {
  useOptimisticDelete,
  useOptimisticUpdate,
} from "@vyrel/graphql-client";
import { useToast } from "heroui-native";

import {
  DeleteUserDocument,
  UpdateUserDocument,
} from "@/features/dashboard/user/graphql/mutations";
import type { OptimisticUserExisting } from "@/features/dashboard/user/graphql/types";

export function useUpdateUserMutation(existingUser: OptimisticUserExisting) {
  const { toast } = useToast();

  return useOptimisticUpdate(UpdateUserDocument, {
    current: existingUser,
    onCompleted: () => {
      toast.show({ label: "Profile updated", variant: "success" });
    },
    onError: (error) => {
      toast.show({
        label: error.message || "Unable to update profile.",
        variant: "danger",
      });
    },
    optimistic: (variables) => ({
      name: variables.input.name ?? existingUser.name,
    }),
  });
}

export function useDeleteUserMutation(userId: string) {
  const { toast } = useToast();

  return useOptimisticDelete(DeleteUserDocument, {
    id: () => userId,
    onCompleted: () => {
      toast.show({ label: "Account deleted", variant: "success" });
    },
    onError: (error) => {
      toast.show({
        label: error.message || "Unable to delete account.",
        variant: "danger",
      });
    },
  });
}

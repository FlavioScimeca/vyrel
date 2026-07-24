import {
  useOptimisticDelete,
  useOptimisticUpdate,
} from "@vyrel/graphql-client";
import { useToast } from "heroui-native";

import {
  DeleteOrganizationDocument,
  UpdateOrganizationDocument,
} from "@/features/dashboard/organization/graphql/mutations";
import type { OptimisticOrganizationExisting } from "@/features/dashboard/organization/graphql/types";

export function useUpdateOrganizationMutation(
  existingOrganization: OptimisticOrganizationExisting
) {
  const { toast } = useToast();

  return useOptimisticUpdate(UpdateOrganizationDocument, {
    current: existingOrganization,
    onCompleted: () => {
      toast.show({ label: "Organization updated", variant: "success" });
    },
    onError: (error) => {
      toast.show({
        label: error.message || "Unable to update organization.",
        variant: "danger",
      });
    },
    optimistic: (variables) => ({
      name: variables.input.name ?? existingOrganization.name,
      slug: variables.input.slug ?? existingOrganization.slug,
    }),
  });
}

export function useDeleteOrganizationMutation() {
  const { toast } = useToast();

  return useOptimisticDelete(DeleteOrganizationDocument, {
    id: ({ input }) => input.organizationId,
    onCompleted: () => {
      toast.show({ label: "Organization deleted", variant: "success" });
    },
    onError: (error) => {
      toast.show({
        label: error.message || "Unable to delete organization.",
        variant: "danger",
      });
    },
  });
}

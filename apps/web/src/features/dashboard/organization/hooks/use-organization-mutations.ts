"use client";

import {
  useOptimisticDelete,
  useOptimisticUpdate,
} from "@vyrel/graphql-client";
import { toast } from "sonner";
import {
  DeleteOrganizationDocument,
  UpdateOrganizationDocument,
} from "@/features/dashboard/organization/graphql/mutations";
import type { OptimisticOrganizationExisting } from "@/features/dashboard/organization/graphql/types";

export function useUpdateOrganizationMutation(
  existingOrganization: OptimisticOrganizationExisting
) {
  return useOptimisticUpdate(UpdateOrganizationDocument, {
    current: existingOrganization,
    onCompleted: () => {
      toast.success("Organization updated");
    },
    onError: (error) => {
      toast.error(error.message || "Unable to update organization.");
    },
    optimistic: (variables) => ({
      name: variables.input.name ?? existingOrganization.name,
      slug: variables.input.slug ?? existingOrganization.slug,
    }),
  });
}

export function useDeleteOrganizationMutation() {
  return useOptimisticDelete(DeleteOrganizationDocument, {
    id: ({ input }) => input.organizationId,
    onCompleted: () => {
      toast.success("Organization deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Unable to delete organization.");
    },
  });
}

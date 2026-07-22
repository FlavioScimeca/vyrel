"use client";

import { useSuspenseQuery } from "@apollo/client/react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreateOrganizationDialog } from "@/features/dashboard/organization/components/create-organization-dialog";
import { OrganizationList } from "@/features/dashboard/organization/components/organization-list";
import { ListOrganizationsDocument } from "@/features/dashboard/organization/graphql/queries";

export default function ManageOrg() {
  const { data, error } = useSuspenseQuery(ListOrganizationsDocument);

  const { organizations } = data;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl tracking-tight">
            Organizations
          </h1>
          <p className="text-muted-foreground text-sm">
            View and manage your workspaces.
          </p>
        </div>
        <CreateOrganizationDialog />
      </header>

      {error === undefined ? (
        <OrganizationList organizations={organizations} />
      ) : (
        <Alert variant="destructive">
          <AlertDescription>
            Unable to load organizations. Please try again.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

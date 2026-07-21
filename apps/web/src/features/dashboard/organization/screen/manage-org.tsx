"use client";

import { useQuery } from "@apollo/client/react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { CreateOrganizationDialog } from "@/features/dashboard/organization/components/create-organization-dialog";
import { OrganizationList } from "@/features/dashboard/organization/components/organization-list";
import { ListOrganizationsDocument } from "@/features/dashboard/organization/graphql/queries";

export default function ManageOrg() {
  const { data, error, loading, refetch } = useQuery(ListOrganizationsDocument);

  const handleOrganizationCreated = () => {
    refetch();
  };

  const organizations = data?.organizations ?? [];

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
        <CreateOrganizationDialog onCreated={handleOrganizationCreated} />
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : null}

      {!loading && error !== undefined ? (
        <Alert variant="destructive">
          <AlertDescription>
            Unable to load organizations. Please try again.
          </AlertDescription>
        </Alert>
      ) : null}

      {!loading && error === undefined ? (
        <OrganizationList organizations={organizations} />
      ) : null}
    </div>
  );
}

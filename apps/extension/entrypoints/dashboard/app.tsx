import { useQuery } from "@apollo/client/react";
import { Button, Spinner } from "@vyrel/shared/ui";
import { OrganizationSwitcher } from "@/src/features/dashboard/organization/components/organization-switcher";
import { CreateTaskDialog } from "@/src/features/dashboard/task/components/create-task-dialog";
import { TaskSummaryDocument } from "@/src/features/dashboard/task/graphql/queries";
import { ApolloProvider } from "@/src/graphql/apollo/provider";
import { getWebTasksUrl } from "@/src/lib/api-base-url";
import { useExtensionAuthState } from "@/src/lib/auth/use-extension-auth-state";

function Dashboard() {
  const { reload, state } = useExtensionAuthState();
  const organizationId =
    state.status === "signed-in" ? state.organizationId : null;
  const summary = useQuery(TaskSummaryDocument, {
    skip: organizationId === null,
    variables: { organizationId: organizationId ?? "" },
  });

  if (state.status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center gap-2 bg-background p-6 text-foreground">
        <Spinner />
        <p className="text-muted-foreground text-xs">Loading session…</p>
      </main>
    );
  }

  if (state.status === "signed-out") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-3 bg-background p-6 text-foreground">
        <h1 className="font-medium text-base">Sign in required</h1>
        <p className="text-muted-foreground text-xs">
          Open the extension popup and sign in to Vyrel, then return here.
        </p>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-3 bg-background p-6 text-foreground">
        <h1 className="font-medium text-base">Session not loaded</h1>
        <p className="text-muted-foreground text-xs">{state.message}</p>
        <Button
          onClick={() => {
            reload().catch(() => undefined);
          }}
          type="button"
        >
          Retry
        </Button>
      </main>
    );
  }

  const total = summary.data?.taskSummary.total;
  const summaryLoading = summary.loading && total === undefined;

  let taskCountBody = (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs">Tasks</p>
      <p className="font-semibold text-3xl tabular-nums">{total ?? 0}</p>
    </div>
  );

  if (summaryLoading) {
    taskCountBody = (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Spinner className="size-4" />
        Loading tasks…
      </div>
    );
  } else if (summary.error) {
    taskCountBody = (
      <div className="space-y-2">
        <p className="text-destructive text-sm">Unable to load task count.</p>
        <Button
          onClick={() => {
            summary.refetch().catch(() => undefined);
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col bg-background text-foreground">
      <header className="space-y-3 border-border border-b p-4">
        <div className="space-y-0.5">
          <p className="text-muted-foreground text-xs">Vyrel Extension</p>
          <h1 className="font-medium text-base">Dashboard</h1>
        </div>
        <OrganizationSwitcher
          activeOrganizationId={organizationId}
          onActiveOrganizationChange={() => {
            reload().catch(() => undefined);
          }}
        />
      </header>

      <section className="flex flex-1 flex-col gap-4 p-4">
        {organizationId === null ? (
          <p className="text-muted-foreground text-sm">
            Select an organization to view tasks.
          </p>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-card p-4">
              {taskCountBody}
            </div>

            <Button
              className="w-full"
              onClick={() => {
                browser.tabs
                  .create({ url: getWebTasksUrl() })
                  .catch(() => undefined);
              }}
              type="button"
              variant="outline"
            >
              Go to tasks
            </Button>
          </>
        )}
      </section>

      <footer className="border-border border-t p-4">
        {organizationId === null ? (
          <Button className="w-full" disabled type="button">
            Create task
          </Button>
        ) : (
          <CreateTaskDialog organizationId={organizationId} />
        )}
      </footer>
    </main>
  );
}

function App() {
  return (
    <ApolloProvider>
      <Dashboard />
    </ApolloProvider>
  );
}

export default App;

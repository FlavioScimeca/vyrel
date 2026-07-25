import { Button, Spinner } from "@vyrel/shared/ui";
import { type ReactNode, useState } from "react";
import { ApolloProvider } from "@/src/graphql/apollo/provider";
import { useExtensionSession } from "@/src/lib/auth/use-extension-session";
import { captureActiveTabAndOpenViewer } from "@/src/lib/capture-visible-tab";

function App() {
  const { checkSession, openWebSignIn, signOut, state } = useExtensionSession();
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  async function handleCapture() {
    setIsCapturing(true);
    setCaptureError(null);

    try {
      await captureActiveTabAndOpenViewer();
      window.close();
    } catch (error) {
      setCaptureError(
        error instanceof Error ? error.message : "Failed to capture page"
      );
      setIsCapturing(false);
    }
  }

  async function openDashboard() {
    await browser.tabs.create({
      url: browser.runtime.getURL("/dashboard.html"),
    });
    window.close();
  }

  let body: ReactNode;

  if (state.status === "checking") {
    body = (
      <main className="flex w-72 items-center justify-center gap-2 bg-background p-6 text-foreground">
        <Spinner />
        <p className="text-muted-foreground text-xs">Checking session…</p>
      </main>
    );
  } else if (state.status === "signed-out") {
    body = (
      <main className="w-72 space-y-3 bg-background p-4 text-foreground">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">Vyrel Extension</p>
          <h1 className="font-medium text-base">Sign in required</h1>
          <p className="text-muted-foreground text-xs">
            Sign in on the Vyrel web app, then return here and check again.
          </p>
        </div>

        <Button
          className="w-full"
          onClick={() => {
            openWebSignIn().catch(() => undefined);
          }}
          type="button"
        >
          Sign in to Vyrel
        </Button>

        <Button
          className="w-full"
          onClick={() => {
            checkSession().catch(() => undefined);
          }}
          type="button"
          variant="outline"
        >
          Check again
        </Button>

        {state.error ? (
          <p className="text-destructive text-xs">{state.error}</p>
        ) : null}
      </main>
    );
  } else {
    body = (
      <main className="w-72 space-y-3 bg-background p-4 text-foreground">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">Vyrel Extension</p>
          <h1 className="font-medium text-base">Page capture</h1>
          <p className="text-muted-foreground text-xs">
            Signed in via {state.webOrigin}
          </p>
        </div>

        <Button
          className="w-full"
          onClick={() => {
            openDashboard().catch(() => undefined);
          }}
          type="button"
        >
          Dashboard
        </Button>

        <Button
          className="w-full"
          disabled={isCapturing}
          onClick={() => {
            handleCapture().catch(() => undefined);
          }}
          type="button"
          variant="outline"
        >
          {isCapturing ? "Capturing…" : "Screenshot page"}
        </Button>

        <Button
          className="w-full"
          onClick={() => {
            signOut().catch(() => undefined);
          }}
          type="button"
          variant="ghost"
        >
          Sign out
        </Button>

        {captureError ? (
          <p className="text-destructive text-xs">{captureError}</p>
        ) : null}
      </main>
    );
  }

  return (
    <ApolloProvider
      onUnauthenticated={() => {
        checkSession().catch(() => undefined);
      }}
    >
      {body}
    </ApolloProvider>
  );
}

export default App;

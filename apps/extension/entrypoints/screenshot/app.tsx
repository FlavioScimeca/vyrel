import { useEffect, useState } from "react";

import { ApolloProvider } from "@/src/graphql/apollo/provider";
import {
  clearStoredScreenshot,
  readStoredScreenshot,
  type StoredScreenshot,
} from "@/src/lib/capture-visible-tab";

type ScreenshotView = StoredScreenshot & {
  height: number;
  width: number;
};

function ScreenshotViewer() {
  const [screenshot, setScreenshot] = useState<ScreenshotView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadScreenshot() {
      try {
        const stored = await readStoredScreenshot();
        if (cancelled) {
          return;
        }

        if (!stored) {
          setError(
            "No screenshot found. Capture one from the extension popup."
          );
          return;
        }

        const image = new Image();
        image.src = stored.dataUrl;
        await image.decode();

        if (cancelled) {
          return;
        }

        setScreenshot({
          ...stored,
          height: image.naturalHeight,
          width: image.naturalWidth,
        });
        await clearStoredScreenshot();
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load screenshot"
        );
      }
    }

    loadScreenshot().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <p className="text-muted-foreground text-sm">{error}</p>
      </main>
    );
  }

  if (!screenshot) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <p className="text-muted-foreground text-sm">Loading screenshot…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <header className="mb-4 space-y-1">
        <h1 className="font-medium text-lg">Captured page</h1>
        {screenshot.title ? (
          <p className="text-muted-foreground text-sm">{screenshot.title}</p>
        ) : null}
        {screenshot.url ? (
          <p className="truncate text-muted-foreground text-xs">
            {screenshot.url}
          </p>
        ) : null}
      </header>
      {/* biome-ignore lint/performance/noImgElement: WXT extension has no next/image; data URL capture */}
      <img
        alt={screenshot.title ?? "Page screenshot"}
        className="mx-auto h-auto max-w-full rounded-lg border border-border shadow-sm"
        height={screenshot.height}
        src={screenshot.dataUrl}
        width={screenshot.width}
      />
    </main>
  );
}

function App() {
  return (
    <ApolloProvider>
      <ScreenshotViewer />
    </ApolloProvider>
  );
}

export default App;

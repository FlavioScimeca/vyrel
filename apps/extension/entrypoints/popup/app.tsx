import { useState } from "react";

import { Button } from "@/src/components/ui/button";
import { captureActiveTabAndOpenViewer } from "@/src/lib/capture-visible-tab";

function App() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCapture() {
    setIsCapturing(true);
    setError(null);

    try {
      await captureActiveTabAndOpenViewer();
      window.close();
    } catch (captureError) {
      setError(
        captureError instanceof Error
          ? captureError.message
          : "Failed to capture page"
      );
      setIsCapturing(false);
    }
  }

  return (
    <main className="w-72 space-y-3 bg-background p-4 text-foreground">
      <div className="space-y-1">
        <p className="text-muted-foreground text-xs">Vyrel Extension</p>
        <h1 className="font-medium text-base">Page capture</h1>
        <p className="text-muted-foreground text-xs">
          Capture the visible tab and open it in a new viewer tab.
        </p>
      </div>

      <Button
        className="w-full"
        disabled={isCapturing}
        onClick={() => {
          handleCapture().catch(() => undefined);
        }}
        type="button"
      >
        {isCapturing ? "Capturing…" : "Screenshot page"}
      </Button>

      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </main>
  );
}

export default App;

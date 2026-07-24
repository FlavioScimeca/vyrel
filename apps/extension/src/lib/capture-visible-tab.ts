const SCREENSHOT_STORAGE_KEY = "vyrel:last-screenshot";

const RESTRICTED_URL_PREFIXES = [
  "about:",
  "chrome://",
  "chrome-extension://",
  "edge://",
  "devtools://",
  "view-source:",
] as const;

export type StoredScreenshot = {
  capturedAt: string;
  dataUrl: string;
  title?: string;
  url?: string;
};

function assertCapturableTab(tab: Browser.tabs.Tab): void {
  if (tab.windowId === undefined) {
    throw new Error("No active tab found to capture");
  }

  const url = tab.url ?? tab.pendingUrl ?? "";

  if (!url) {
    throw new Error(
      "This tab has no URL yet (still loading or a browser page). Open a normal http(s) page and try again."
    );
  }

  const isRestricted = RESTRICTED_URL_PREFIXES.some((prefix) =>
    url.startsWith(prefix)
  );

  if (isRestricted) {
    throw new Error(
      "Can't capture browser/system pages. Open a normal website (http/https) and try again."
    );
  }
}

export async function captureActiveTabAndOpenViewer(): Promise<void> {
  const [tab] = await browser.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });

  if (!tab) {
    throw new Error("No active tab found to capture");
  }

  assertCapturableTab(tab);

  const dataUrl = await browser.tabs.captureVisibleTab(tab.windowId, {
    format: "png",
  });

  const screenshot: StoredScreenshot = {
    capturedAt: new Date().toISOString(),
    dataUrl,
    title: tab.title,
    url: tab.url,
  };

  await browser.storage.session.set({
    [SCREENSHOT_STORAGE_KEY]: screenshot,
  });

  await browser.tabs.create({
    url: browser.runtime.getURL("/screenshot.html"),
  });
}

export async function readStoredScreenshot(): Promise<StoredScreenshot | null> {
  const result = await browser.storage.session.get(SCREENSHOT_STORAGE_KEY);
  const screenshot = result[SCREENSHOT_STORAGE_KEY];

  if (!screenshot || typeof screenshot !== "object") {
    return null;
  }

  return screenshot as StoredScreenshot;
}

export async function clearStoredScreenshot(): Promise<void> {
  await browser.storage.session.remove(SCREENSHOT_STORAGE_KEY);
}

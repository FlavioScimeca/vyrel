"use client";

import { IconLoader2 } from "@tabler/icons-react";

export default function LoadingPage() {
  return (
    <div className="grid min-h-svh place-items-center">
      <IconLoader2 className="size-6 animate-spin" />
    </div>
  );
}

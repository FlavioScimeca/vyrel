"use client";

import { SpinnerIcon } from "@phosphor-icons/react";

export default function LoadingPage() {
  return (
    <div className="grid min-h-svh place-items-center">
      <SpinnerIcon className="size-6 animate-spin" />
    </div>
  );
}

import { type ReactNode, StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@/src/styles/index.css";

export function mountReact(app: ReactNode) {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Root element #root not found");
  }

  createRoot(root).render(<StrictMode>{app}</StrictMode>);
}

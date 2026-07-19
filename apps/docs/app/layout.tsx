import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import logo from "../../../logo.png";

import "./global.css";

export const metadata: Metadata = {
  description:
    "Architecture, development guides, and public package documentation for the Vyrel TypeScript monorepo.",
  icons: {
    icon: logo.src,
  },
  title: {
    default: "Vyrel Documentation",
    template: "%s | Vyrel",
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}

import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";

import { baseOptions } from "../../lib/layout.shared";
import { source } from "../../lib/source";

interface DocsLayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: DocsLayoutProps) {
  return (
    <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}

import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Image from "next/image";

import logo from "../../../logo.png";

export function baseOptions(): BaseLayoutProps {
  return {
    githubUrl: "https://github.com/FlavioScimeca/vyrel",
    links: [
      {
        text: "Morph",
        url: "/docs/public-packages/morph",
      },
      {
        text: "GraphQL Client",
        url: "/docs/public-packages/graphql-client",
      },
    ],
    nav: {
      title: (
        <span className="flex items-center gap-2 font-semibold">
          <Image alt="" aria-hidden height={24} src={logo} width={24} />
          <span>Vyrel</span>
        </span>
      ),
      url: "/docs",
    },
  };
}

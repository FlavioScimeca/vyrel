import { tegami } from "tegami";
import { runCli } from "tegami/cli";
import { github } from "tegami/plugins/github";

const paper = tegami({
  npm: {
    client: "bun",
  },
  packages: {
    vyrel: {},
  },
  plugins: [
    github({
      repo: "vyrel/vyrel",
      versionPr: {
        base: "main",
      },
    }),
  ],
});

await runCli(paper);

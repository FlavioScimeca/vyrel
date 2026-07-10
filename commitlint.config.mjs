const scopes = [
  "morph",
  "web",
  "server",
  "api",
  "graphql",
  "auth",
  "db",
  "ci",
  "deps",
  "release",
  "docs",
  "extension",
  "config",
  "root",
];

/** @type {import("@commitlint/types").UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [2, "always", scopes],
  },
};

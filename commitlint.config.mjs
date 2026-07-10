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

/** @type {import("cz-git").UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  prompt: {
    allowCustomScopes: false,
    allowEmptyScopes: false,
    maxSubjectLength: 100,
    scopes,
    skipQuestions: ["body", "footer"],
    upperCaseSubject: false,
  },
  rules: {
    "scope-enum": [2, "always", scopes],
  },
};

const types = [
  { value: "feat", name: "✨ feat:     A new feature" },
  { value: "fix", name: "🐛 fix:      A bug fix" },
  {
    value: "refactor",
    name: "♻️ refactor: Code change without bug fix or feature",
  },
  { value: "ci", name: "🔄 ci:       CI configuration and scripts" },
  { value: "chore", name: "🔨 chore:    Maintenance and tooling" },
];

const scopes = [
  { value: "morph", name: "🧬 morph      Public morph package" },
  {
    value: "graphql-client",
    name: "🧬 graphql-client      Public graphql-client package",
  },
  { value: "web", name: "🌐 web         Frontend app" },
  { value: "server", name: "🖥️ server      Backend API server" },
  { value: "mobile", name: "📱 mobile      Mobile app" },
  { value: "docs", name: "📚 docs         Documentation" },
  { value: "extension", name: "🧩 extension    Editor extension" },
  { value: "root", name: "🏠 root         Monorepo root" },
];

const scopeValues = scopes.map((scope) => scope.value);

/** @type {import("cz-git").UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  prompt: {
    allowCustomScopes: false,
    allowEmptyScopes: false,
    maxSubjectLength: 100,
    scopes,
    skipQuestions: ["body", "footer"],
    types,
    upperCaseSubject: false,
    themeColorCode: "38;5;141",
    confirmColorize: true,
    typesSearchValue: false,
    scopesSearchValue: false,
  },
  rules: {
    "scope-enum": [2, "always", scopeValues],
  },
};

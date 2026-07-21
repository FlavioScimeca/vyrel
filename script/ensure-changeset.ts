import type { FileSystem } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import confirm from "@inquirer/confirm";
import input from "@inquirer/input";
import select from "@inquirer/select";
import { Effect } from "effect";
import type { ParseError } from "effect/ParseResult";
import {
  type Bump,
  bumpFromCommit,
  changedPublicPackages,
  clearIntent,
  createAndStageChangeset,
  isAutomationEnvironment,
  isInteractiveTerminal,
  listStagedFiles,
  loadPublicPackageNames,
  needsChangesetDecision,
  parseCommitMessage,
  readIntent,
} from "./changeset-utils";
import { scriptRuntime } from "./runtime";

const bumpChoices: Array<{ name: string; value: Bump }> = [
  { name: "patch", value: "patch" },
  { name: "minor", value: "minor" },
  { name: "major", value: "major" },
];

const writeLog = (message: string): Effect.Effect<void> =>
  Effect.sync(() => {
    process.stderr.write(`${message}\n`);
  });

const promptBump = (defaultBump: Bump): Effect.Effect<Bump> =>
  Effect.promise(() =>
    select<Bump>({
      choices: bumpChoices,
      default: defaultBump,
      message: "Select semver bump for the changeset:",
      pageSize: 5,
    })
  );

const promptSummary = (defaultSummary: string): Effect.Effect<string> =>
  Effect.gen(function* () {
    const summary = yield* Effect.promise(() =>
      input({
        default: defaultSummary,
        message: "Changeset summary (changelog entry):",
      })
    );

    const trimmed = summary.trim();
    return trimmed.length > 0 ? trimmed : defaultSummary;
  });

const resolveChangesetPlan = ({
  breaking,
  subject,
  type,
  changedPackages,
}: {
  breaking: boolean;
  subject: string;
  type: string;
  changedPackages: string[];
}): Effect.Effect<
  { bump: Bump; summary: string } | null,
  PlatformError | ParseError,
  FileSystem.FileSystem
> =>
  Effect.gen(function* () {
    const intent = yield* readIntent();

    if (intent?.action === "skip") {
      yield* clearIntent();
      yield* writeLog("Changeset skipped by choice");
      return null;
    }

    if (intent?.action === "create") {
      const summary = isInteractiveTerminal()
        ? yield* promptSummary(subject)
        : subject;

      yield* clearIntent();
      return {
        bump: intent.bump,
        summary,
      };
    }

    if (isInteractiveTerminal() && Bun.env.VYREL_INTERACTIVE_COMMIT !== "1") {
      const shouldCreate = yield* Effect.promise(() =>
        confirm({
          default: true,
          message: `Create a changeset for ${changedPackages.join(", ")}?`,
        })
      );

      if (!shouldCreate) {
        yield* writeLog("Changeset skipped");
        return null;
      }

      const bump = yield* promptBump(bumpFromCommit(type, breaking));
      const summary = yield* promptSummary(subject);

      return { bump, summary };
    }

    return {
      bump: bumpFromCommit(type, breaking),
      summary: subject,
    };
  });

const program = Effect.gen(function* () {
  const [messagePath, source = "message"] = process.argv.slice(2);

  if (
    Bun.env.SKIP_CHANGESET === "1" ||
    isAutomationEnvironment() ||
    source === "merge" ||
    source === "squash"
  ) {
    return;
  }

  const stagedFiles = listStagedFiles();
  const publicPackages = loadPublicPackageNames();
  const changedPackages = changedPublicPackages(stagedFiles, publicPackages);

  if (!needsChangesetDecision(stagedFiles, changedPackages)) {
    yield* clearIntent();
    return;
  }

  if (messagePath === undefined) {
    yield* writeLog(
      "Public package files are staged without a changeset, but no commit message file was provided."
    );
    return;
  }

  const { breaking, subject, type } = parseCommitMessage(messagePath);

  if (subject === "version packages") {
    yield* writeLog("Skipping auto-changeset for changesets version commit");
    return;
  }

  const plan = yield* resolveChangesetPlan({
    breaking,
    changedPackages,
    subject,
    type,
  });

  if (plan === null) {
    return;
  }

  const relativePath = yield* createAndStageChangeset({
    bump: plan.bump,
    packages: changedPackages,
    summary: plan.summary,
  });

  const bumpSummary = changedPackages
    .map((name) => `${name}: ${plan.bump}`)
    .join(", ");

  yield* writeLog(`Created changeset ${relativePath} (${bumpSummary})`);
});

if (import.meta.main) {
  await scriptRuntime.runPromise(program);
}

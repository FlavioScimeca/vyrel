import confirm from "@inquirer/confirm";
import input from "@inquirer/input";
import select from "@inquirer/select";
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

const bumpChoices: Array<{ name: string; value: Bump }> = [
  { name: "patch", value: "patch" },
  { name: "minor", value: "minor" },
  { name: "major", value: "major" },
];

const writeLog = (message: string): void => {
  process.stderr.write(`${message}\n`);
};

const promptBump = async (defaultBump: Bump): Promise<Bump> =>
  select<Bump>({
    choices: bumpChoices,
    default: defaultBump,
    message: "Select semver bump for the changeset:",
    pageSize: 5,
  });

const promptSummary = async (defaultSummary: string): Promise<string> => {
  const summary = await input({
    default: defaultSummary,
    message: "Changeset summary (changelog entry):",
  });

  const trimmed = summary.trim();
  return trimmed.length > 0 ? trimmed : defaultSummary;
};

const resolveChangesetPlan = async ({
  breaking,
  subject,
  type,
  changedPackages,
}: {
  breaking: boolean;
  subject: string;
  type: string;
  changedPackages: string[];
}): Promise<{ bump: Bump; summary: string } | null> => {
  const intent = await readIntent();

  if (intent?.action === "skip") {
    await clearIntent();
    writeLog("Changeset skipped by choice");
    return null;
  }

  if (intent?.action === "create") {
    const summary = isInteractiveTerminal()
      ? await promptSummary(subject)
      : subject;

    await clearIntent();
    return {
      bump: intent.bump,
      summary,
    };
  }

  if (isInteractiveTerminal() && Bun.env.VYREL_INTERACTIVE_COMMIT !== "1") {
    const shouldCreate = await confirm({
      default: true,
      message: `Create a changeset for ${changedPackages.join(", ")}?`,
    });

    if (!shouldCreate) {
      writeLog("Changeset skipped");
      return null;
    }

    const bump = await promptBump(bumpFromCommit(type, breaking));
    const summary = await promptSummary(subject);

    return { bump, summary };
  }

  return {
    bump: bumpFromCommit(type, breaking),
    summary: subject,
  };
};

const [messagePath, source = "message"] = process.argv.slice(2);

if (
  Bun.env.SKIP_CHANGESET !== "1" &&
  !isAutomationEnvironment() &&
  source !== "merge" &&
  source !== "squash"
) {
  const stagedFiles = listStagedFiles();
  const publicPackages = loadPublicPackageNames();
  const changedPackages = changedPublicPackages(stagedFiles, publicPackages);

  if (needsChangesetDecision(stagedFiles, changedPackages)) {
    if (messagePath === undefined) {
      writeLog(
        "Public package files are staged without a changeset, but no commit message file was provided."
      );
    } else {
      const { breaking, subject, type } = parseCommitMessage(messagePath);

      if (subject === "version packages") {
        writeLog("Skipping auto-changeset for changesets version commit");
      } else {
        const plan = await resolveChangesetPlan({
          breaking,
          changedPackages,
          subject,
          type,
        });

        if (plan !== null) {
          const relativePath = await createAndStageChangeset({
            bump: plan.bump,
            packages: changedPackages,
            summary: plan.summary,
          });

          const bumpSummary = changedPackages
            .map((name) => `${name}: ${plan.bump}`)
            .join(", ");

          writeLog(`Created changeset ${relativePath} (${bumpSummary})`);
        }
      }
    }
  } else {
    await clearIntent();
  }
}

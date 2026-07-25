#!/usr/bin/env bun

import { existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";
import cliProgress from "cli-progress";
import { config as loadEnvFile } from "dotenv";

const MOBILE_ROOT = join(import.meta.dir, "..");

loadEnvFile({ path: join(MOBILE_ROOT, ".env") });

const { env } = await import("@vyrel/env/native");

const fail = (message: string): never => {
  console.error(`\n${message}\n`);
  process.exit(1);
};

const { APK_NAME, BUCKET_REPO } = env;
if (!BUCKET_REPO) {
  fail(
    "Missing BUCKET_REPO. Add it to apps/mobile/.env (format: owner/repo).\nSee apps/mobile/.env.example."
  );
}

const APK_PATH = join(MOBILE_ROOT, "dist", APK_NAME);
const UPLOAD_URL_TEMPLATE_SUFFIX = /\{[^}]*\}$/;
const CURL_PROGRESS_LINE =
  /^\s*(\d+)\s+(\S+)\s+(\d+)\s+(\S+)\s+(\d+)\s+(\S+)\s+/;
const CURL_PROGRESS_CHUNK_SEPARATOR = /\r|\n/;

const timestampTag = (): string => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    "dev",
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`,
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`,
  ].join("-");
};

const formatBytes = (bytes: number): string => {
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toFixed(1)} MB`;
};

const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.round(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
};

const copyToClipboard = async (text: string): Promise<void> => {
  if (!Bun.which("pbcopy")) {
    return;
  }

  const process = Bun.spawn(["pbcopy"], { stdin: "pipe" });
  process.stdin.write(text);
  process.stdin.end();
  await process.exited;
};

const parseCurlUploadedBytes = (
  line: string,
  sizeBytes: number
): number | null => {
  const match = CURL_PROGRESS_LINE.exec(line);
  if (!match) {
    return null;
  }

  // curl columns: % Total, Total, % Received, Received, % Xferd, Xferd, ...
  const uploadPercent = Number(match[5]);
  if (Number.isNaN(uploadPercent)) {
    return null;
  }

  return Math.min(Math.round((uploadPercent / 100) * sizeBytes), sizeBytes);
};

const postFileWithProgress = async (
  uploadUrl: string,
  apkPath: string,
  sizeBytes: number,
  token: string
): Promise<void> => {
  if (!Bun.which("curl")) {
    fail("Missing `curl`, needed to upload with progress.");
  }

  const responsePath = join(
    MOBILE_ROOT,
    "dist",
    ".github-upload-response.json"
  );
  const bar = new cliProgress.SingleBar(
    {
      format: "  {bar} {percentage}%  {transferred} / {totalSize}",
      barCompleteChar: "█",
      barIncompleteChar: "░",
      hideCursor: true,
      clearOnComplete: false,
      stopOnComplete: true,
    },
    cliProgress.Presets.shades_classic
  );

  bar.start(sizeBytes, 0, {
    transferred: formatBytes(0),
    totalSize: formatBytes(sizeBytes),
  });

  const upload = Bun.spawn(
    [
      "curl",
      "--fail",
      "--show-error",
      "--progress-meter",
      "--location",
      "-X",
      "POST",
      "--header",
      `Authorization: Bearer ${token}`,
      "--header",
      "Accept: application/vnd.github+json",
      "--header",
      "Content-Type: application/octet-stream",
      "--header",
      `Content-Length: ${sizeBytes}`,
      "--data-binary",
      `@${apkPath}`,
      "--output",
      responsePath,
      uploadUrl,
    ],
    {
      stdout: "ignore",
      stderr: "pipe",
      stdin: "ignore",
    }
  );

  const { stderr } = upload;
  if (!stderr) {
    bar.stop();
    fail("Failed to capture curl progress output.");
  }

  const decoder = new TextDecoder();
  let pending = "";
  const reader = stderr.getReader();

  try {
    // biome-ignore lint/suspicious/noUnnecessaryConditions: loop exits via reader.done
    while (true) {
      // biome-ignore lint/performance/noAwaitInLoops: sequential stderr stream read
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      pending += decoder.decode(value, { stream: true });
      const parts = pending.split(CURL_PROGRESS_CHUNK_SEPARATOR);
      pending = parts.pop() ?? "";

      for (const line of parts) {
        const uploaded = parseCurlUploadedBytes(line, sizeBytes);
        if (uploaded === null) {
          continue;
        }

        bar.update(uploaded, {
          transferred: formatBytes(uploaded),
          totalSize: formatBytes(sizeBytes),
        });
      }
    }
  } catch (error) {
    bar.stop();
    throw error;
  }

  const exitCode = await upload.exited;
  if (exitCode !== 0) {
    bar.stop();
    fail(`Upload failed (curl exit code ${exitCode}).`);
  }

  bar.update(sizeBytes, {
    transferred: formatBytes(sizeBytes),
    totalSize: formatBytes(sizeBytes),
  });
  bar.stop();
};

const uploadApkWithProgress = async (
  tag: string,
  title: string,
  notes: string,
  apkPath: string,
  sizeBytes: number
): Promise<void> => {
  console.log(`Creating GitHub release ${tag}...`);
  await $`gh release create ${tag} --repo ${BUCKET_REPO} --title ${title} --notes ${notes} --latest`;

  const uploadUrlTemplate = (
    await $`gh api repos/${BUCKET_REPO}/releases/tags/${tag} --jq .upload_url`.text()
  ).trim();
  const uploadUrl = `${uploadUrlTemplate.replace(UPLOAD_URL_TEMPLATE_SUFFIX, "")}?name=${encodeURIComponent(APK_NAME)}`;
  const token = (await $`gh auth token`.text()).trim();

  console.log(
    `\nUploading ${APK_NAME} (${formatBytes(sizeBytes)}) to ${BUCKET_REPO}...\n`
  );

  try {
    await postFileWithProgress(uploadUrl, apkPath, sizeBytes, token);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
};

const main = async (): Promise<void> => {
  const startedAt = Date.now();
  const skipBuild = process.argv.includes("--skip-build");

  if (!Bun.which("gh")) {
    fail(
      "Missing `gh` (GitHub CLI).\nInstall: brew install gh\nThen: gh auth login"
    );
  }

  const authStatus = await $`gh auth status`.quiet().nothrow();
  if (authStatus.exitCode !== 0) {
    fail("GitHub CLI is not authenticated. Run: gh auth login");
  }

  mkdirSync(join(MOBILE_ROOT, "dist"), { recursive: true });

  if (skipBuild) {
    console.log("Skipping build (--skip-build). Using existing APK...\n");
  } else {
    console.log("Building Android development APK locally...\n");
    await $`bun run eas:dev-android-local`.cwd(MOBILE_ROOT);
  }

  if (!existsSync(APK_PATH)) {
    fail(
      skipBuild
        ? `No APK found at:\n${APK_PATH}\nRun without --skip-build first.`
        : `Build finished but APK was not found at:\n${APK_PATH}`
    );
  }

  const sizeBytes = statSync(APK_PATH).size;
  const tag = timestampTag();
  const title = `Android Dev ${tag}`;
  const notes = "Local development Android APK.";

  await uploadApkWithProgress(tag, title, notes, APK_PATH, sizeBytes);

  const downloadUrl = `https://github.com/${BUCKET_REPO}/releases/latest/download/${APK_NAME}`;

  console.log("\nAPK published:");
  console.log(downloadUrl);

  await copyToClipboard(downloadUrl);
  if (Bun.which("pbcopy")) {
    console.log("Download link copied to clipboard.");
  }

  console.log("\nQR code (scan with your phone):\n");
  await $`bunx qrcode --small ${downloadUrl}`;

  console.log(`\nDone in ${formatDuration(Date.now() - startedAt)}.`);
};

await main();

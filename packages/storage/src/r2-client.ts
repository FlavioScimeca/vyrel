import { env } from "@vyrel/env/server";
import { S3Client } from "bun";

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

let r2Client: S3Client | undefined;

function getR2Config(): R2Config {
  const {
    R2_ACCOUNT_ID: accountId,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_BUCKET_NAME: bucket,
  } = env;

  if (
    accountId.length === 0 ||
    accessKeyId.length === 0 ||
    secretAccessKey.length === 0 ||
    bucket.length === 0
  ) {
    throw new Error(
      "Missing object storage configuration. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME."
    );
  }

  return {
    accessKeyId,
    accountId,
    bucket,
    secretAccessKey,
  };
}

/**
 * Cloudflare R2 client for file storage (S3-compatible)
 * @see https://bun.com/docs/runtime/s3
 * @see https://developers.cloudflare.com/r2/api/s3/api/
 */
export function getR2Client(): S3Client {
  const config = getR2Config();

  r2Client ??= new S3Client({
    accessKeyId: config.accessKeyId,
    bucket: config.bucket,
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    secretAccessKey: config.secretAccessKey,
  });

  return r2Client;
}

export function getR2BucketName(): string {
  return getR2Config().bucket;
}

export function getR2AccountId(): string {
  return getR2Config().accountId;
}

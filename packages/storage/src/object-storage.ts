import { env } from "@vyrel/env/server";
import { Effect } from "effect";

import { ObjectNotFoundError, ObjectStorageError } from "./errors";
import { getR2AccountId, getR2BucketName, getR2Client } from "./r2-client";

type UploadBody = Buffer | Uint8Array | string | ReadableStream;

export type UploadResult = {
  readonly key: string;
  readonly etag?: string;
};

export type DownloadResult = {
  readonly body: ReadableStream | null;
  readonly contentType?: string;
  readonly contentLength?: number;
};

function toWritePayload(
  body: UploadBody
): string | Buffer | Uint8Array | Response {
  if (body instanceof ReadableStream) {
    return new Response(body);
  }

  return body;
}

function storageError(operation: string, cause: unknown): ObjectStorageError {
  return new ObjectStorageError({
    cause,
    message: `Object storage ${operation} failed.`,
    operation,
  });
}

function rootStorageCause(error: unknown): unknown {
  let current = error;
  for (let depth = 0; depth < 6; depth += 1) {
    if (
      current !== null &&
      typeof current === "object" &&
      "cause" in current &&
      current.cause !== undefined
    ) {
      current = current.cause;
      continue;
    }
    return current;
  }
  return current;
}

/** User-facing message for R2/S3 upload failures. */
export function messageForObjectStorageFailure(error: unknown): string {
  const root = rootStorageCause(error);
  const code =
    root !== null &&
    typeof root === "object" &&
    "code" in root &&
    typeof root.code === "string"
      ? root.code
      : undefined;
  let detail: string | undefined;
  if (root instanceof Error) {
    detail = root.message;
  } else if (
    root !== null &&
    typeof root === "object" &&
    "message" in root &&
    typeof root.message === "string"
  ) {
    detail = root.message;
  }

  if (code === "AccessDenied" || detail === "Access Denied") {
    return "Object storage access denied. Check R2 API token permissions and that R2_JURISDICTION matches the bucket (omit it unless the bucket is EU/FedRAMP jurisdiction).";
  }

  if (detail !== undefined && detail.length > 0) {
    return `Unable to store image in object storage (${detail}).`;
  }

  if (code !== undefined) {
    return `Unable to store image in object storage (${code}).`;
  }

  return "Unable to store image in object storage.";
}

function tryStorage<A>(
  operation: string,
  execute: () => Promise<A>
): Effect.Effect<A, ObjectStorageError> {
  return Effect.tryPromise({
    catch: (cause) => storageError(operation, cause),
    try: execute,
  });
}

export const uploadObject = (
  key: string,
  body: UploadBody,
  options?: {
    contentType?: string;
  }
): Effect.Effect<UploadResult, ObjectStorageError> =>
  Effect.gen(function* () {
    const client = getR2Client();

    yield* tryStorage("upload", () =>
      client.write(key, toWritePayload(body), {
        type: options?.contentType,
      })
    );

    const stat = yield* tryStorage("stat", () => client.stat(key));

    return {
      etag: stat.etag,
      key,
    };
  });

export const downloadObject = (
  key: string
): Effect.Effect<DownloadResult, ObjectStorageError> =>
  Effect.gen(function* () {
    const file = getR2Client().file(key);
    const stat = yield* tryStorage("download-stat", () => file.stat());

    return {
      body: file.stream(),
      contentLength: stat.size,
      contentType: stat.type,
    };
  });

export const downloadObjectAsBuffer = (
  key: string
): Effect.Effect<Buffer, ObjectNotFoundError | ObjectStorageError> =>
  Effect.gen(function* () {
    const file = getR2Client().file(key);
    const exists = yield* tryStorage("exists", () => file.exists());

    if (!exists) {
      return yield* new ObjectNotFoundError({
        key,
        message: `File not found: ${key}`,
      });
    }

    const bytes = yield* tryStorage("download", () => file.bytes());
    return Buffer.from(bytes);
  });

export const deleteObject = (
  key: string
): Effect.Effect<void, ObjectStorageError> =>
  tryStorage("delete", () => getR2Client().delete(key));

export const deleteObjects = (
  keys: readonly string[]
): Effect.Effect<void, ObjectStorageError> =>
  Effect.all(
    keys.map((key) => deleteObject(key)),
    {
      concurrency: "unbounded",
    }
  ).pipe(Effect.asVoid);

export const objectExists = (
  key: string
): Effect.Effect<boolean, ObjectStorageError> =>
  tryStorage("exists", () => getR2Client().exists(key));

export function getSignedDownloadUrl(
  key: string,
  options?: {
    expiresIn?: number;
    responseContentDisposition?: string;
  }
): string {
  return getR2Client().presign(key, {
    contentDisposition: options?.responseContentDisposition,
    expiresIn: options?.expiresIn ?? env.R2_SIGNED_URL_TTL_SECONDS,
  });
}

export function getSignedUploadUrl(
  key: string,
  options?: {
    contentType?: string;
    expiresIn?: number;
  }
): string {
  return getR2Client().presign(key, {
    expiresIn: options?.expiresIn ?? env.R2_SIGNED_URL_TTL_SECONDS,
    method: "PUT",
    type: options?.contentType,
  });
}

export function getPublicObjectUrl(key: string, customDomain?: string): string {
  if (customDomain !== undefined && customDomain.length > 0) {
    return `https://${customDomain}/${key}`;
  }

  return `https://${getR2BucketName()}.${getR2AccountId()}.r2.dev/${key}`;
}

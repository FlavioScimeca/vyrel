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

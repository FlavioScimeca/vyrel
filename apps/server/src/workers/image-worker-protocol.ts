export type ImageWorkerSource =
  | {
      type: "url";
      url: string;
    }
  | {
      type: "path";
      path: string;
    };

export type ImageWorkerInput =
  | {
      mode?: "diagnostic";
    }
  | {
      mode: "probe-image";
      source: ImageWorkerSource;
      maxPixels?: number;
      maxInputBytes?: number;
    };

export type ImageWorkerRuntimeInfo = {
  bunVersion: string;
  bunRevision: string;
  hasBunImage: string;
  platform: string;
  architecture: string;
};

export type ImageWorkerImageInfo = {
  width: number;
  height: number;
  byteLength: number;
};

export type ImageWorkerSuccess = {
  success: true;
  runtime: ImageWorkerRuntimeInfo;
  image?: ImageWorkerImageInfo;
};

export type ImageWorkerFailure = {
  success: false;
  error: string;
  code?: string;
};

export type ImageWorkerResponse = ImageWorkerSuccess | ImageWorkerFailure;

export type ImageWorkerFailureCode =
  | "WORKER_NOT_FOUND"
  | "WORKER_NOT_EXECUTABLE"
  | "WORKER_SPAWN_FAILED"
  | "WORKER_TIMEOUT"
  | "WORKER_STDOUT_LIMIT"
  | "WORKER_STDERR_LIMIT"
  | "WORKER_EXIT_NON_ZERO"
  | "WORKER_INVALID_JSON";

export type ImageWorkerRunResult =
  | {
      ok: true;
      path: string;
      durationMs: number;
      exitCode: 0;
      result: ImageWorkerSuccess;
      stderr: string;
    }
  | {
      ok: false;
      path: string | null;
      durationMs: number;
      code: ImageWorkerFailureCode;
      exitCode: number | null;
      error: string;
      stdout: string;
      stderr: string;
    };

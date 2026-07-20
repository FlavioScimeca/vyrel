export type PortingWorkerSource =
  | {
      type: "url";
      url: string;
    }
  | {
      type: "path";
      path: string;
    }
  | {
      type: "bytes-base64";
      data: string;
    };

export type PortingImageFilter =
  | "nearest"
  | "box"
  | "bilinear"
  | "linear"
  | "cubic"
  | "mitchell"
  | "lanczos2"
  | "lanczos3"
  | "mks2013"
  | "mks2021";

export type PortingImageOperation =
  | {
      op: "resize";
      width: number;
      height?: number;
      options?: {
        filter?: PortingImageFilter;
        fit?: "fill" | "inside";
        withoutEnlargement?: boolean;
      };
    }
  | {
      op: "webp";
      options?: {
        quality?: number;
      };
    }
  | {
      op: "jpeg";
      options?: {
        quality?: number;
      };
    }
  | {
      op: "png";
      options?: Record<string, unknown>;
    };

export type PortingPipelineTerminal =
  | "metadata"
  | "bytes"
  | "buffer"
  | "blob"
  | "dataurl";

export type PortingPipelineSpec = {
  operations: PortingImageOperation[];
  terminal: PortingPipelineTerminal;
};

export type PortingWorkerInput =
  | {
      mode?: "diagnostic";
    }
  | {
      mode: "probe-image";
      source: Exclude<PortingWorkerSource, { type: "bytes-base64" }>;
      maxPixels?: number;
      maxInputBytes?: number;
    }
  | {
      mode: "execute-pipeline";
      source: PortingWorkerSource;
      maxPixels?: number;
      maxInputBytes?: number;
      operations: PortingImageOperation[];
      terminal: PortingPipelineTerminal;
    }
  | {
      mode: "execute-pipelines";
      source: PortingWorkerSource;
      maxPixels?: number;
      maxInputBytes?: number;
      pipelines: Record<string, PortingPipelineSpec>;
    };

export type PortingWorkerRuntimeInfo = {
  bunVersion: string;
  bunRevision: string;
  hasBunImage: string;
  platform: string;
  architecture: string;
};

export type PortingWorkerImageInfo = {
  width: number;
  height: number;
  byteLength: number;
};

export type PortingWorkerPipelineResult = {
  metadata?: {
    width: number;
    height: number;
    format?: string;
  };
  bytesBase64?: string;
  dataUrl?: string;
  byteLength?: number;
};

export type PortingWorkerSuccess = {
  success: true;
  runtime: PortingWorkerRuntimeInfo;
  image?: PortingWorkerImageInfo;
  pipeline?: PortingWorkerPipelineResult;
  /** Present for `execute-pipelines` (keyed like the request). */
  pipelines?: Record<string, PortingWorkerPipelineResult>;
};

export type PortingWorkerFailure = {
  success: false;
  error: string;
  code?: string;
};

export type PortingWorkerResponse = PortingWorkerSuccess | PortingWorkerFailure;

export type PortingWorkerFailureCode =
  | "WORKER_NOT_FOUND"
  | "WORKER_NOT_EXECUTABLE"
  | "WORKER_SPAWN_FAILED"
  | "WORKER_TIMEOUT"
  | "WORKER_STDOUT_LIMIT"
  | "WORKER_STDERR_LIMIT"
  | "WORKER_EXIT_NON_ZERO"
  | "WORKER_INVALID_JSON";

export type PortingWorkerRunResult =
  | {
      ok: true;
      path: string;
      durationMs: number;
      exitCode: 0;
      result: PortingWorkerSuccess;
      stderr: string;
    }
  | {
      ok: false;
      path: string | null;
      durationMs: number;
      code: PortingWorkerFailureCode;
      exitCode: number | null;
      error: string;
      stdout: string;
      stderr: string;
    };

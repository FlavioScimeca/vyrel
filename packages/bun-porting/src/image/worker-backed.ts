import type {
  PortingImageOperation,
  PortingPipelineTerminal,
  PortingWorkerPipelineResult,
  PortingWorkerSource,
} from "../internal/protocol";
import { runPortingWorker } from "../internal/runner";
import type {
  BunImageInput,
  BunImageJpegOptions,
  BunImageLike,
  BunImageMetadata,
  BunImageOptions,
  BunImageResizeOptions,
  BunImageWebpOptions,
} from "./types";

const DEFAULT_MAX_PIXELS = 16_777_216;
const DEFAULT_MAX_INPUT_BYTES = 25_000_000;

const toUint8Array = async (input: BunImageInput): Promise<Uint8Array> => {
  if (typeof input === "string") {
    return Bun.file(input).bytes();
  }
  if (typeof input === "object" && input !== null && "path" in input) {
    return Bun.file(input.path).bytes();
  }
  if (typeof input === "object" && input !== null && "url" in input) {
    const response = await fetch(input.url);
    if (!response.ok) {
      throw new Error(
        `Failed to download image (${response.status} ${response.statusText}).`
      );
    }
    return new Uint8Array(await response.arrayBuffer());
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  if (input instanceof Blob) {
    return new Uint8Array(await input.arrayBuffer());
  }
  return input instanceof Uint8Array ? input : new Uint8Array(input);
};

const toSource = async (input: BunImageInput): Promise<PortingWorkerSource> => {
  if (typeof input === "object" && input !== null && "url" in input) {
    return { type: "url", url: input.url };
  }
  if (typeof input === "object" && input !== null && "path" in input) {
    return { path: input.path, type: "path" };
  }
  if (typeof input === "string") {
    return { path: input, type: "path" };
  }

  const bytes = await toUint8Array(input);
  return {
    data: Buffer.from(bytes).toString("base64"),
    type: "bytes-base64",
  };
};

/**
 * Worker-backed Bun.Image facade: queues chainable ops and executes them in one
 * spawn when a terminal method is awaited.
 */
export class WorkerBackedBunImage implements BunImageLike {
  private readonly input: BunImageInput;
  private readonly options: BunImageOptions;
  private readonly operations: PortingImageOperation[];
  private cachedWidth = -1;
  private cachedHeight = -1;

  constructor(
    input: BunImageInput,
    options?: BunImageOptions,
    operations: PortingImageOperation[] = []
  ) {
    this.input = input;
    this.options = options ?? {};
    this.operations = operations;
  }

  private clone(operations: PortingImageOperation[]): WorkerBackedBunImage {
    return new WorkerBackedBunImage(this.input, this.options, operations);
  }

  resize(
    width: number,
    height?: number,
    options?: BunImageResizeOptions
  ): BunImageLike {
    return this.clone([
      ...this.operations,
      {
        height,
        op: "resize",
        options,
        width,
      },
    ]);
  }

  webp(options?: BunImageWebpOptions): BunImageLike {
    return this.clone([...this.operations, { op: "webp", options }]);
  }

  jpeg(options?: BunImageJpegOptions): BunImageLike {
    return this.clone([...this.operations, { op: "jpeg", options }]);
  }

  png(options?: Record<string, unknown>): BunImageLike {
    return this.clone([...this.operations, { op: "png", options }]);
  }

  private async execute(
    terminal: PortingPipelineTerminal
  ): Promise<PortingWorkerPipelineResult> {
    const source = await toSource(this.input);
    const run = await runPortingWorker({
      maxInputBytes: DEFAULT_MAX_INPUT_BYTES,
      maxPixels: this.options.maxPixels ?? DEFAULT_MAX_PIXELS,
      mode: "execute-pipeline",
      operations: this.operations,
      source,
      terminal,
    });

    if (!run.ok) {
      throw new Error(run.error);
    }

    if (run.result.pipeline === undefined) {
      throw new Error("porting-worker returned no pipeline result.");
    }

    const { metadata } = run.result.pipeline;
    if (metadata !== undefined) {
      this.cachedWidth = metadata.width;
      this.cachedHeight = metadata.height;
    }

    return run.result.pipeline;
  }

  async metadata(): Promise<BunImageMetadata> {
    const pipeline = await this.execute("metadata");
    if (pipeline.metadata === undefined) {
      throw new Error("porting-worker metadata missing.");
    }
    return pipeline.metadata;
  }

  async bytes(): Promise<Uint8Array> {
    const pipeline = await this.execute("bytes");
    if (pipeline.bytesBase64 === undefined) {
      throw new Error("porting-worker bytes missing.");
    }
    return Buffer.from(pipeline.bytesBase64, "base64");
  }

  async buffer(): Promise<ArrayBuffer> {
    const bytes = await this.bytes();
    return bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer;
  }

  async blob(): Promise<Blob> {
    const bytes = await this.bytes();
    return new Blob([
      bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      ) as ArrayBuffer,
    ]);
  }

  async dataurl(): Promise<string> {
    const pipeline = await this.execute("dataurl");
    if (pipeline.dataUrl === undefined) {
      throw new Error("porting-worker dataurl missing.");
    }
    return pipeline.dataUrl;
  }

  get width(): number {
    return this.cachedWidth;
  }

  get height(): number {
    return this.cachedHeight;
  }
}

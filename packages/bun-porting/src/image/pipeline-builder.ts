import type { PortingImageOperation } from "../internal/protocol";
import type {
  BunImageJpegOptions,
  BunImageResizeOptions,
  BunImageWebpOptions,
} from "./types";

/**
 * Lazy op collector for {@link BunImage.batch}. Chainable like Bun.Image but
 * never executes terminals (no spawn / no decode).
 */
export class PipelineBuilder {
  private readonly operations: PortingImageOperation[];

  constructor(operations: PortingImageOperation[] = []) {
    this.operations = operations;
  }

  resize(
    width: number,
    height?: number,
    options?: BunImageResizeOptions
  ): PipelineBuilder {
    return new PipelineBuilder([
      ...this.operations,
      {
        height,
        op: "resize",
        options,
        width,
      },
    ]);
  }

  webp(options?: BunImageWebpOptions): PipelineBuilder {
    return new PipelineBuilder([...this.operations, { op: "webp", options }]);
  }

  jpeg(options?: BunImageJpegOptions): PipelineBuilder {
    return new PipelineBuilder([...this.operations, { op: "jpeg", options }]);
  }

  png(options?: Record<string, unknown>): PipelineBuilder {
    return new PipelineBuilder([...this.operations, { op: "png", options }]);
  }

  /** Snapshot of recorded operations for worker / native execution. */
  toOperations(): PortingImageOperation[] {
    return [...this.operations];
  }
}

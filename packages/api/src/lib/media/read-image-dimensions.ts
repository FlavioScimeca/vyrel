const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function readByte(buffer: Buffer, offset: number): number {
  return buffer[offset] ?? 0;
}

function readUInt24LE(buffer: Buffer, offset: number): number {
  return (
    readByte(buffer, offset) +
    readByte(buffer, offset + 1) * 256 +
    readByte(buffer, offset + 2) * 65_536
  );
}

function readUInt32LE(buffer: Buffer, offset: number): number {
  return buffer.readUInt32LE(offset);
}

function readPngDimensions(
  buffer: Buffer
): { width: number; height: number } | null {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return null;
  }
  if (buffer.toString("ascii", 12, 16) !== "IHDR") {
    return null;
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width <= 0 || height <= 0) {
    return null;
  }

  return { height, width };
}

function isJpegStartOfFrame(marker: number): boolean {
  if (marker >= 0xc0 && marker <= 0xc3) {
    return true;
  }
  if (marker >= 0xc5 && marker <= 0xc7) {
    return true;
  }
  if (marker >= 0xc9 && marker <= 0xcb) {
    return true;
  }
  return marker >= 0xcd && marker <= 0xcf;
}

function readJpegFrameDimensions(
  buffer: Buffer,
  offset: number
): { width: number; height: number } | null {
  const height = buffer.readUInt16BE(offset + 5);
  const width = buffer.readUInt16BE(offset + 7);
  if (width <= 0 || height <= 0) {
    return null;
  }
  return { height, width };
}

function readJpegDimensions(
  buffer: Buffer
): { width: number; height: number } | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1] ?? 0;
    if (marker === 0xd8 || marker === 0x01) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2 || offset + 2 + segmentLength > buffer.length) {
      break;
    }

    if (isJpegStartOfFrame(marker)) {
      return readJpegFrameDimensions(buffer, offset);
    }

    offset += 2 + segmentLength;
  }

  return null;
}

function readWebpVp8xDimensions(
  buffer: Buffer
): { width: number; height: number } | null {
  const width = 1 + readUInt24LE(buffer, 24);
  const height = 1 + readUInt24LE(buffer, 27);
  return width > 0 && height > 0 ? { height, width } : null;
}

function readWebpVp8lDimensions(
  buffer: Buffer
): { width: number; height: number } | null {
  const bits = readUInt32LE(buffer, 21);
  const width = (bits % 16_384) + 1;
  const height = (Math.floor(bits / 16_384) % 16_384) + 1;
  return width > 0 && height > 0 ? { height, width } : null;
}

function readWebpVp8Dimensions(
  buffer: Buffer
): { width: number; height: number } | null {
  const frameOffset = 20;
  const width = buffer.readUInt16LE(frameOffset + 6) % 16_384;
  const height = buffer.readUInt16LE(frameOffset + 8) % 16_384;
  return width > 0 && height > 0 ? { height, width } : null;
}

function readWebpDimensions(
  buffer: Buffer
): { width: number; height: number } | null {
  if (buffer.length < 30) {
    return null;
  }
  if (buffer.toString("ascii", 0, 4) !== "RIFF") {
    return null;
  }
  if (buffer.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }

  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return readWebpVp8xDimensions(buffer);
  }
  if (chunk === "VP8L") {
    return buffer.length < 25 ? null : readWebpVp8lDimensions(buffer);
  }
  if (chunk === "VP8 ") {
    return buffer.length < 33 ? null : readWebpVp8Dimensions(buffer);
  }

  return null;
}

export function readImageDimensionsFromBuffer(
  buffer: Buffer
): { width: number; height: number } | null {
  return (
    readPngDimensions(buffer) ??
    readJpegDimensions(buffer) ??
    readWebpDimensions(buffer)
  );
}

export function fitInsideBox(
  width: number,
  height: number,
  maxSide: number
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide) {
    return { height, width };
  }

  const scale = maxSide / longest;
  return {
    height: Math.max(1, Math.round(height * scale)),
    width: Math.max(1, Math.round(width * scale)),
  };
}

function resolvePreparedOutputDimensions(input: {
  imageWidth: number;
  imageHeight: number;
  outputBuffer: Buffer;
  sourceWidth: number;
  sourceHeight: number;
  maxSide: number;
  hasKnownSourceSize: boolean;
}): { width: number; height: number } {
  const probedOutput = readImageDimensionsFromBuffer(input.outputBuffer);

  if (probedOutput !== null) {
    return probedOutput;
  }

  if (input.imageWidth > 0 && input.imageHeight > 0) {
    return { height: input.imageHeight, width: input.imageWidth };
  }

  if (input.hasKnownSourceSize) {
    return fitInsideBox(input.sourceWidth, input.sourceHeight, input.maxSide);
  }

  return { height: 0, width: 0 };
}

export function resolveSourceImageSizing(input: {
  sourceBuffer: Buffer;
  imageWidth: number;
  imageHeight: number;
  maxSide: number;
}): {
  sourceWidth: number;
  sourceHeight: number;
  hasKnownSourceSize: boolean;
  shouldResize: boolean;
} {
  const probedSource = readImageDimensionsFromBuffer(input.sourceBuffer);
  let sourceWidth = 0;
  let sourceHeight = 0;

  if (probedSource) {
    sourceWidth = probedSource.width;
    sourceHeight = probedSource.height;
  } else {
    sourceWidth = input.imageWidth > 0 ? input.imageWidth : 0;
    sourceHeight = input.imageHeight > 0 ? input.imageHeight : 0;
  }
  const hasKnownSourceSize = sourceWidth > 0 && sourceHeight > 0;

  return {
    hasKnownSourceSize,
    shouldResize: hasKnownSourceSize
      ? Math.max(sourceWidth, sourceHeight) > input.maxSide
      : true,
    sourceHeight,
    sourceWidth,
  };
}

export function resolvePreparedDesignDimensions(input: {
  sourceBuffer: Buffer;
  imageWidth: number;
  imageHeight: number;
  outputBuffer: Buffer;
  maxSide: number;
}): {
  sourceWidth: number;
  sourceHeight: number;
  width: number;
  height: number;
  hasKnownSourceSize: boolean;
  shouldResize: boolean;
  wasResized: boolean;
} {
  const source = resolveSourceImageSizing({
    imageHeight: input.imageHeight,
    imageWidth: input.imageWidth,
    maxSide: input.maxSide,
    sourceBuffer: input.sourceBuffer,
  });
  const { width, height } = resolvePreparedOutputDimensions({
    hasKnownSourceSize: source.hasKnownSourceSize,
    imageHeight: input.imageHeight,
    imageWidth: input.imageWidth,
    maxSide: input.maxSide,
    outputBuffer: input.outputBuffer,
    sourceHeight: source.sourceHeight,
    sourceWidth: source.sourceWidth,
  });

  const wasResized =
    source.hasKnownSourceSize &&
    (width !== source.sourceWidth || height !== source.sourceHeight) &&
    Math.max(source.sourceWidth, source.sourceHeight) > input.maxSide;

  return {
    hasKnownSourceSize: source.hasKnownSourceSize,
    height,
    shouldResize: source.shouldResize,
    sourceHeight: source.hasKnownSourceSize ? source.sourceHeight : height,
    sourceWidth: source.hasKnownSourceSize ? source.sourceWidth : width,
    wasResized,
    width,
  };
}

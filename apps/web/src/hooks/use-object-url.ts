"use client";

import { useEffect, useMemo } from "react";

/**
 * Creates an object URL for a File and revokes it when the file changes or
 * the consumer unmounts. `useMemo` is intentional: `createObjectURL` must not
 * run on every render.
 */
export function useObjectUrl(file: File | undefined): string | null {
  // react-doctor-disable-next-line react-doctor/react-compiler-no-manual-memoization
  const previewUrl = useMemo(
    () => (file === undefined ? null : URL.createObjectURL(file)),
    [file]
  );

  useEffect(() => {
    if (previewUrl === null) {
      return;
    }
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return previewUrl;
}

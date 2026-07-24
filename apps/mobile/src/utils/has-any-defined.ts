export const hasAnyDefined = <T extends object>(
  source: T,
  keys: readonly (keyof T)[]
): boolean => keys.some((key) => source[key] !== undefined);

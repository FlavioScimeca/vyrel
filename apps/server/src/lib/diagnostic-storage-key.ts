const DIAGNOSTIC_STORAGE_KEY_PATTERN = /^diagnostics\/[a-zA-Z0-9._/-]+$/;

export const isValidDiagnosticStorageKey = (storageKey: string): boolean =>
  DIAGNOSTIC_STORAGE_KEY_PATTERN.test(storageKey) && !storageKey.includes("..");

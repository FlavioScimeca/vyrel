import { AsyncLocalStorage } from "node:async_hooks";

export interface SqlEntry {
  ms: number;
  sql: string;
}

export interface ProfileStore {
  authMs?: number;
  executeMs?: number;
  operationName?: string;
  parseMs?: number;
  request: Request;
  sql: SqlEntry[];
  startedAt: number;
  validateMs?: number;
}

export const profileAls = new AsyncLocalStorage<ProfileStore>();

export function createProfileStore(request: Request): ProfileStore {
  return {
    request,
    sql: [],
    startedAt: performance.now(),
  };
}

export function getProfile(): ProfileStore | undefined {
  return profileAls.getStore();
}

export function recordSql(sql: string, ms: number): void {
  const s = getProfile();
  if (s !== undefined) {
    s.sql.push({ ms, sql });
  }
}

export function truncateSql(sql: string, maxLen: number): string {
  const t = sql.replace(/\s+/g, " ").trim();
  return t.length > maxLen ? `${t.slice(0, maxLen)}…` : t;
}

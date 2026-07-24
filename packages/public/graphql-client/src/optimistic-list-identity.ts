const DEFAULT_OPTIMISTIC_ID_PREFIX = "optimistic-";

export type OptimisticListIdentity = {
  /**
   * Register a pending optimistic entity and return its temporary id.
   * Pass an id to reuse one; omit to generate `optimistic-<uuid>`.
   */
  readonly begin: (optimisticId?: string) => string;
  /**
   * Bind a pending optimistic id to the server id.
   * Call from the mutation `update` callback when the real entity arrives
   * (before React re-renders from the cache write).
   */
  readonly commit: (optimisticId: string, realId: string) => void;
  /** Drop a pending optimistic id (mutation error / abort). */
  readonly abandon: (optimisticId: string) => void;
  /** Remove a completed real entity mapping after a successful delete. */
  readonly release: (entityId: string) => void;
  /** Remove every mapping when the owning feature/list is unmounted. */
  readonly clear: () => void;
  /**
   * Stable React list key across the optimistic → real id swap.
   * Falls back to `entityId` when no binding exists.
   */
  readonly getKey: (entityId: string) => string;
  /** Whether `entityId` uses this identity's optimistic prefix. */
  readonly isOptimisticId: (entityId: string) => boolean;
};

export type CreateOptimisticListIdentityOptions = {
  /**
   * Prefix for generated ids and {@link OptimisticListIdentity.isOptimisticId}.
   * Defaults to `"optimistic-"`.
   */
  readonly prefix?: string;
  /** Override id generation when {@link OptimisticListIdentity.begin} omits an id. */
  readonly createId?: () => string;
};

const createDefaultOptimisticId = (prefix: string): string => {
  const randomId = globalThis.crypto?.randomUUID?.();
  return `${prefix}${randomId ?? Math.random().toString(36).slice(2)}`;
};

/**
 * Opt-in tracker for stable React list keys when Apollo replaces an optimistic
 * create id with the server id. Create one instance per feature/list and pass
 * it to `useOptimisticCreate`; use `getKey` as the list item `key`.
 */
export const createOptimisticListIdentity = (
  options: CreateOptimisticListIdentityOptions = {}
): OptimisticListIdentity => {
  const prefix = options.prefix ?? DEFAULT_OPTIMISTIC_ID_PREFIX;
  const createId =
    options.createId ?? (() => createDefaultOptimisticId(prefix));

  const identityByEntityId = new Map<string, string>();

  const begin = (optimisticId = createId()): string => {
    if (identityByEntityId.has(optimisticId)) {
      throw new Error(
        `Optimistic list identity "${optimisticId}" is already registered.`
      );
    }
    identityByEntityId.set(optimisticId, optimisticId);
    return optimisticId;
  };

  const commit = (optimisticId: string, realId: string): void => {
    const stableKey = identityByEntityId.get(optimisticId);
    if (stableKey === undefined) {
      return;
    }

    identityByEntityId.set(realId, stableKey);
    if (optimisticId !== realId) {
      identityByEntityId.delete(optimisticId);
    }
  };

  const abandon = (optimisticId: string): void => {
    identityByEntityId.delete(optimisticId);
  };

  const release = (entityId: string): void => {
    identityByEntityId.delete(entityId);
  };

  const clear = (): void => {
    identityByEntityId.clear();
  };

  const getKey = (entityId: string): string =>
    identityByEntityId.get(entityId) ?? entityId;

  const isOptimisticId = (entityId: string): boolean =>
    entityId.startsWith(prefix);

  return { abandon, begin, clear, commit, getKey, isOptimisticId, release };
};

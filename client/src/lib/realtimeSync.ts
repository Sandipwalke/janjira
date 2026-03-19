import type { ClientStoreSnapshot } from "./store";

export const SYNC_VERSION = 1;

export interface SnapshotSyncMeta {
  version: number;
  updatedAt: string;
  sourceId: string;
}

export interface SyncedSnapshot extends ClientStoreSnapshot {
  __syncMeta?: SnapshotSyncMeta;
}

export function createSyncMeta(sourceId: string, now = new Date()): SnapshotSyncMeta {
  return {
    version: SYNC_VERSION,
    updatedAt: now.toISOString(),
    sourceId,
  };
}

export function stampSnapshot(snapshot: ClientStoreSnapshot, sourceId: string, now = new Date()): SyncedSnapshot {
  return {
    ...snapshot,
    __syncMeta: createSyncMeta(sourceId, now),
  };
}

export function readSyncMeta(snapshot: ClientStoreSnapshot | SyncedSnapshot | null | undefined): SnapshotSyncMeta | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const maybeMeta = (snapshot as SyncedSnapshot).__syncMeta;
  if (!maybeMeta || typeof maybeMeta !== "object") return null;
  if (typeof maybeMeta.updatedAt !== "string" || typeof maybeMeta.sourceId !== "string") return null;
  if (typeof maybeMeta.version !== "number") return null;
  return maybeMeta;
}

export function shouldApplyIncomingSnapshot(
  localSnapshot: ClientStoreSnapshot | SyncedSnapshot | null,
  incomingSnapshot: ClientStoreSnapshot | SyncedSnapshot,
  localSourceId: string,
): boolean {
  const incomingMeta = readSyncMeta(incomingSnapshot);
  if (!incomingMeta) {
    return true;
  }

  if (incomingMeta.sourceId === localSourceId) {
    return false;
  }

  const localMeta = readSyncMeta(localSnapshot);
  if (!localMeta) {
    return true;
  }

  return new Date(incomingMeta.updatedAt).getTime() > new Date(localMeta.updatedAt).getTime();
}

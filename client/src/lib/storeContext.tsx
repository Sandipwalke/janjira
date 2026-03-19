/**
 * StoreContext — wraps ClientStore in React state so mutations trigger re-renders.
 * All pages use useStore() instead of useQuery/apiRequest.
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { store, ClientStore, STORE_STORAGE_KEY, type ClientStoreSnapshot } from "./store";
import { stampSnapshot, shouldApplyIncomingSnapshot, type SyncedSnapshot } from "./realtimeSync";

const AUTH_STORAGE_KEY = "janjira.auth.user.email";
const SYNC_CHANNEL_NAME = "janjira.sync.snapshots.v1";
const SNAPSHOT_POLL_INTERVAL_MS = 5000;
import type {
  User, Organization, OrgMember, OrgInvite, Project, Sprint, Label,
  Issue, Comment, Attachment, IssueStatus, IssuePriority, IssueType, MemberRole,
} from "@shared/schema";

interface StoreCtx {
  // tick forces re-renders after mutations
  tick: number;
  refresh: () => void;
  store: ClientStore;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [tick, setTick] = useState(0);
  const [syncSourceId] = useState(() => `tab-${Math.random().toString(36).slice(2)}`);

  const persistSnapshot = useCallback((snapshot: ClientStoreSnapshot, sourceId: string, broadcast?: BroadcastChannel) => {
    const syncedSnapshot = stampSnapshot(snapshot, sourceId);
    window.localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(syncedSnapshot));
    if (broadcast) {
      broadcast.postMessage({ type: "snapshot", payload: syncedSnapshot });
    }

    const authEmail = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (authEmail) {
      fetch(`/api/snapshots/${encodeURIComponent(authEmail)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(syncedSnapshot),
      }).catch(() => {
        // Ignore sync failures and keep local state as source of truth.
      });
    }
  }, []);

  const refresh = useCallback(() => {
    const snapshot = store.toSnapshot();
    persistSnapshot(snapshot, syncSourceId);
    setTick(t => t + 1);
  }, [persistSnapshot, syncSourceId]);

  useEffect(() => {
    const broadcast = typeof window !== "undefined" && "BroadcastChannel" in window
      ? new BroadcastChannel(SYNC_CHANNEL_NAME)
      : undefined;

    const applyIfNewer = (incoming: ClientStoreSnapshot | SyncedSnapshot | null) => {
      if (!incoming) return;

      const localRaw = window.localStorage.getItem(STORE_STORAGE_KEY);
      const localSnapshot = localRaw ? (JSON.parse(localRaw) as ClientStoreSnapshot | SyncedSnapshot) : null;

      if (!shouldApplyIncomingSnapshot(localSnapshot, incoming, syncSourceId)) {
        return;
      }

      store.hydrateFromSnapshot(incoming);
      window.localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(incoming));
      setTick(t => t + 1);
    };

    const hydrate = async () => {
      try {
        const raw = window.localStorage.getItem(STORE_STORAGE_KEY);
        if (raw) {
          const snapshot = JSON.parse(raw) as ClientStoreSnapshot | SyncedSnapshot;
          store.hydrateFromSnapshot(snapshot);
        } else {
          persistSnapshot(store.toSnapshot(), syncSourceId, broadcast);
        }

        const authEmail = window.localStorage.getItem(AUTH_STORAGE_KEY);
        if (authEmail) {
          try {
            const res = await fetch(`/api/snapshots/${encodeURIComponent(authEmail)}`);
            if (res.ok) {
              const data = await res.json() as { snapshot?: ClientStoreSnapshot | SyncedSnapshot | null };
              applyIfNewer(data.snapshot ?? null);
            }
          } catch {
            // Ignore server sync errors and continue with local data.
          }
        }
      } catch {
        // Ignore malformed storage and continue with seed data.
      } finally {
        setHydrated(true);
        setTick(t => t + 1);
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORE_STORAGE_KEY || !event.newValue) return;
      try {
        applyIfNewer(JSON.parse(event.newValue) as ClientStoreSnapshot | SyncedSnapshot);
      } catch {
        // Ignore malformed cross-tab storage messages.
      }
    };

    const onBroadcast = (event: MessageEvent<{ type: string; payload?: ClientStoreSnapshot | SyncedSnapshot }>) => {
      if (event.data?.type !== "snapshot" || !event.data.payload) return;
      applyIfNewer(event.data.payload);
    };

    window.addEventListener("storage", onStorage);
    broadcast?.addEventListener("message", onBroadcast);

    const pollingHandle = window.setInterval(async () => {
      const authEmail = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (!authEmail) return;
      try {
        const res = await fetch(`/api/snapshots/${encodeURIComponent(authEmail)}`);
        if (!res.ok) return;
        const data = await res.json() as { snapshot?: ClientStoreSnapshot | SyncedSnapshot | null };
        applyIfNewer(data.snapshot ?? null);
      } catch {
        // Ignore temporary polling failures.
      }
    }, SNAPSHOT_POLL_INTERVAL_MS);

    void hydrate();

    return () => {
      window.removeEventListener("storage", onStorage);
      broadcast?.removeEventListener("message", onBroadcast);
      broadcast?.close();
      window.clearInterval(pollingHandle);
    };
  }, [persistSnapshot, syncSourceId]);

  if (!hydrated) return null;
  return <Ctx.Provider value={{ tick, refresh, store }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

// ─── Convenience hooks ────────────────────────────────────────────────────────

export function useOrg(orgId: string) {
  const { store, tick } = useStore();
  return store.getOrg(orgId);
}

export function useProjects(orgId: string) {
  const { store, tick } = useStore();
  return store.getProjectsForOrg(orgId);
}

export function useProject(projectId: string) {
  const { store, tick } = useStore();
  return store.getProject(projectId);
}

export function useSprints(projectId: string) {
  const { store, tick } = useStore();
  return store.getSprintsForProject(projectId);
}

export function useLabels(projectId: string) {
  const { store, tick } = useStore();
  return store.getLabelsForProject(projectId);
}

export function useIssues(projectId: string) {
  const { store, tick } = useStore();
  return store.getIssuesForProject(projectId);
}

export function useIssue(issueId: string) {
  const { store, tick } = useStore();
  return store.getIssue(issueId);
}

export function useComments(issueId: string) {
  const { store, tick } = useStore();
  return store.getCommentsForIssue(issueId);
}

export function useActivity(issueId: string) {
  const { store, tick } = useStore();
  return store.getActivityForIssue(issueId);
}

export function useAttachments(issueId: string) {
  const { store, tick } = useStore();
  return store.getAttachmentsForIssue(issueId);
}

export function useOrgMembers(orgId: string) {
  const { store, tick } = useStore();
  return store.getOrgMembers(orgId);
}

export function useOrgInvites(orgId: string) {
  const { store, tick } = useStore();
  return store.getInvitesForOrg(orgId);
}

export function useProjectStats(projectId: string) {
  const { store, tick } = useStore();
  return store.getProjectStats(projectId);
}

export function useUsers() {
  const { store, tick } = useStore();
  return Array.from(store.users.values());
}

export function useUser(id: string | undefined) {
  const { store, tick } = useStore();
  return id ? store.getUser(id) : undefined;
}

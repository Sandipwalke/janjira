/**
 * StoreContext — wraps ClientStore in React state so mutations trigger re-renders.
 * All pages use useStore() instead of useQuery/apiRequest.
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { store, ClientStore, STORE_STORAGE_KEY, type ClientStoreSnapshot } from "./store";

const AUTH_STORAGE_KEY = "janjira.auth.user.email";
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
  const refresh = useCallback(() => {
    const snapshot = store.toSnapshot();
    window.localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(snapshot));

    const authEmail = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (authEmail) {
      fetch(`/api/snapshots/${encodeURIComponent(authEmail)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      }).catch(() => {
        // Ignore sync failures and keep local state as source of truth.
      });
    }

    setTick(t => t + 1);
  }, []);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const raw = window.localStorage.getItem(STORE_STORAGE_KEY);
        if (raw) {
          const snapshot = JSON.parse(raw) as ClientStoreSnapshot;
          store.hydrateFromSnapshot(snapshot);
        } else {
          window.localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(store.toSnapshot()));
        }

        const authEmail = window.localStorage.getItem(AUTH_STORAGE_KEY);
        if (authEmail) {
          try {
            const res = await fetch(`/api/snapshots/${encodeURIComponent(authEmail)}`);
            if (res.ok) {
              const data = await res.json() as { snapshot?: ClientStoreSnapshot | null };
              if (data.snapshot) {
                store.hydrateFromSnapshot(data.snapshot);
                window.localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(store.toSnapshot()));
              }
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

    void hydrate();
  }, []);

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

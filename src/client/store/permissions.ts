import { create } from "zustand";
import type { Event, Permission } from "@opencode-ai/sdk/client";
import { oc } from "@/lib/opencode";

export type PermissionResponse = "once" | "always" | "reject";

interface PermissionsState {
  /** Pending permissions per session, head of array = currently active prompt. */
  bySession: Record<string, Permission[]>;
  /** IDs of permissions whose reply is in flight (optimistic UI). */
  pending: Record<string, true>;

  applyEvent: (event: Event) => void;
  reply: (permission: Permission, response: PermissionResponse) => Promise<void>;
  /** Head of the queue for `sessionID`, or `null` when empty. */
  head: (sessionID: string) => Permission | null;
  /** Total pending count across all sessions (for global indicators). */
  totalCount: () => number;
  clear: (sessionID?: string) => void;
}

function dedupeAppend(list: Permission[] | undefined, p: Permission): Permission[] {
  const arr = list ?? [];
  if (arr.some((x) => x.id === p.id)) {
    // Replace in place so the latest payload wins (e.g. metadata refresh).
    return arr.map((x) => (x.id === p.id ? p : x));
  }
  return [...arr, p];
}

export const usePermissionsStore = create<PermissionsState>((set, get) => ({
  bySession: {},
  pending: {},

  applyEvent: (event) => {
    if (event.type === "permission.updated") {
      const p = event.properties;
      set((s) => ({
        bySession: { ...s.bySession, [p.sessionID]: dedupeAppend(s.bySession[p.sessionID], p) },
      }));
      return;
    }
    if (event.type === "permission.replied") {
      const { sessionID, permissionID } = event.properties;
      set((s) => {
        const cur = s.bySession[sessionID];
        if (!cur) return {};
        const next = cur.filter((x) => x.id !== permissionID);
        const pending = { ...s.pending };
        delete pending[permissionID];
        return {
          bySession: { ...s.bySession, [sessionID]: next },
          pending,
        };
      });
    }
  },

  reply: async (permission, response) => {
    // Optimistically remove from the queue so the UI advances immediately;
    // the server-emitted `permission.replied` event will be a no-op.
    set((s) => {
      const cur = s.bySession[permission.sessionID];
      if (!cur) return { pending: { ...s.pending, [permission.id]: true } };
      const next = cur.filter((x) => x.id !== permission.id);
      return {
        bySession: { ...s.bySession, [permission.sessionID]: next },
        pending: { ...s.pending, [permission.id]: true },
      };
    });

    try {
      await oc.postSessionIdPermissionsPermissionId({
        path: { id: permission.sessionID, permissionID: permission.id },
        body: { response },
      });
    } catch (err) {
      // Re-enqueue at the head so the user can retry.
      set((s) => {
        const cur = s.bySession[permission.sessionID] ?? [];
        const pending = { ...s.pending };
        delete pending[permission.id];
        return {
          bySession: {
            ...s.bySession,
            [permission.sessionID]: cur.some((x) => x.id === permission.id)
              ? cur
              : [permission, ...cur],
          },
          pending,
        };
      });
      throw err;
    } finally {
      set((s) => {
        const pending = { ...s.pending };
        delete pending[permission.id];
        return { pending };
      });
    }
  },

  head: (sessionID) => {
    const arr = get().bySession[sessionID];
    return arr && arr.length > 0 ? arr[0]! : null;
  },

  totalCount: () => {
    let n = 0;
    for (const arr of Object.values(get().bySession)) n += arr.length;
    return n;
  },

  clear: (sessionID) => {
    set((s) => {
      if (!sessionID) return { bySession: {}, pending: {} };
      const next = { ...s.bySession };
      delete next[sessionID];
      return { bySession: next };
    });
  },
}));

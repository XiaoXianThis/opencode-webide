import { useState, useCallback } from "react";
import { useSessionsStore } from "@/store/sessions";
import { usePermissionsStore, type PermissionResponse } from "@/store/permissions";
import { PermissionDialog } from "./PermissionDialog";

/**
 * Top-level container that surfaces the next pending permission for the
 * currently active session. Permissions for inactive sessions accumulate in
 * the store but are not rendered until the user switches into them.
 */
export function PermissionCenter() {
  const activeId = useSessionsStore((s) => s.activeId);
  // Select the raw bucket (stable reference across re-renders); coerce to []
  // outside the selector so we never return a fresh array literal, which
  // would loop zustand's referential equality check.
  const queue = usePermissionsStore((s) => (activeId ? s.bySession[activeId] : undefined));
  const reply = usePermissionsStore((s) => s.reply);
  const [busyId, setBusyId] = useState<string | null>(null);

  const head = queue && queue.length > 0 ? queue[0] : undefined;
  const queueLength = queue?.length ?? 0;

  const onReply = useCallback(
    (response: PermissionResponse) => {
      if (!head) return;
      setBusyId(head.id);
      void reply(head, response).finally(() => setBusyId((id) => (id === head.id ? null : id)));
    },
    [head, reply],
  );

  if (!head) return null;
  return (
    <PermissionDialog
      key={head.id}
      permission={head}
      queueDepth={Math.max(0, queueLength - 1)}
      isReplying={busyId === head.id}
      onReply={onReply}
    />
  );
}

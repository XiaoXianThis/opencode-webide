export type FileStatusBadgeState = "modified" | "staged" | "untracked" | "added" | "deleted";

const LABELS: Record<FileStatusBadgeState, string> = {
  modified: "M",
  staged: "S",
  untracked: "U",
  added: "A",
  deleted: "D",
};

export function FileStatusBadge({ status }: { status?: FileStatusBadgeState }) {
  if (!status) return null;
  return (
    <span
      data-testid={`file-status-${status}`}
      className="rounded-small bg-warning/15 px-1 text-[10px] font-semibold text-warning"
      aria-label={`文件状态 ${status}`}
    >
      {LABELS[status]}
    </span>
  );
}

import { useEffect } from "react";
import { BriefcaseBusiness } from "lucide-react";
import { Button } from "@heroui/react";
import { useProjectsStore } from "@/store/projects";

function projectName(worktree: string): string {
  return worktree.split(/[\\/]/).filter(Boolean).at(-1) ?? worktree;
}

export function ProjectBar() {
  const projects = useProjectsStore((s) => s.projects);
  const activeProjectId = useProjectsStore((s) => s.activeProjectId);
  const load = useProjectsStore((s) => s.load);
  const select = useProjectsStore((s) => s.select);
  const active = projects.find((project) => project.id === activeProjectId) ?? null;

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex h-9 shrink-0 items-center gap-2 border-b border-default-200 bg-content1/70 px-2">
      <BriefcaseBusiness className="h-3.5 w-3.5 text-default-500" aria-hidden />
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto" role="listbox" aria-label="项目">
        {projects.map((project) => (
          <Button
            key={project.id}
            size="sm"
            variant={project.id === activeProjectId ? "flat" : "light"}
            color={project.id === activeProjectId ? "primary" : "default"}
            className="h-7 max-w-36 justify-start px-2 text-xs"
            role="option"
            aria-selected={project.id === activeProjectId}
            onPress={() => select(project.id)}
          >
            <span className="truncate">{projectName(project.worktree)}</span>
          </Button>
        ))}
      </div>
      {active && (
        <span className="hidden truncate text-[10px] text-default-500 lg:block" data-testid="project-worktree">
          {active.worktree}
        </span>
      )}
    </div>
  );
}

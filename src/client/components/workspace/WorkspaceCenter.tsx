import { CommandPalette } from "./CommandPalette";
import { EditorPane } from "./EditorPane";
import { EditorTabs } from "./EditorTabs";
import { FileTree } from "./FileTree";
import { ProjectBar } from "./ProjectBar";
import { PtyPanel } from "./PtyPanel";

export function WorkspaceCenter() {
  return (
    <main className="flex h-full min-w-0 flex-1 overflow-hidden bg-background">
      <FileTree />
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <ProjectBar />
        <EditorTabs />
        <EditorPane />
        <PtyPanel />
      </section>
      <CommandPalette />
    </main>
  );
}

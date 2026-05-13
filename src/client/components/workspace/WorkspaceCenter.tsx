import { CommandPalette } from "./CommandPalette";
import { EditorPane } from "./EditorPane";
import { EditorTabs } from "./EditorTabs";
import { FileTree } from "./FileTree";

export function WorkspaceCenter() {
  return (
    <main className="flex h-full min-w-0 flex-1 bg-background">
      <FileTree />
      <section className="flex min-w-0 flex-1 flex-col">
        <EditorTabs />
        <EditorPane />
      </section>
      <CommandPalette />
    </main>
  );
}
